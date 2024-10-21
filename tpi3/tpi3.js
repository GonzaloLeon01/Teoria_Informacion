#!/usr/bin/env node

const fs = require('fs');
const path = require("path");
// Clase para nodos del árbol de Huffman
class Nodo {
    constructor(caracter, frecuencia) {
        this.caracter = caracter;
        this.frecuencia = frecuencia;
        this.left = null;
        this.right = null;
    }
}

class Huffman {

    constructor() {
        this.tabla = new Map();
        this.frequencies = new Map();
    }
    construirArbolDeHuffman() {

        // Crear nodos iniciales
        const nodosHuffman = Array.from(this.frequencies.entries()).map(
            ([char, frecuencia]) => new Nodo(char, frecuencia)
        );

        // Construir árbol
        while (nodosHuffman.length > 1) {//por alguna razon lo hace mal
            nodosHuffman.sort((a, b) => a.frecuencia - b.frecuencia);
            const left = nodosHuffman.shift();
            const right = nodosHuffman.shift();
            const parent = new Nodo(null, left.frecuencia + right.frecuencia);
            parent.left = left;
            parent.right = right;
            nodosHuffman.push(parent);
        }

        // Generar códigos
        this.generarCodigos(nodosHuffman[0], "");
        return nodosHuffman[0];
    }

    generarCodigos(node, codigo) {
        if (node != null) {
            if (node.caracter !== null) {
                this.tabla.set(node.caracter, codigo);
                return;
            }
            this.generarCodigos(node.left, codigo + "0");
            this.generarCodigos(node.right, codigo + "1");
        }
    }

    comprimir(arch) {
        // Calcular frecuencias
        for (let char of arch) {
            this.frequencies.set(char, (this.frequencies.get(char) || 0) + 1);//Para cada carácter (char) en el archivo, se verifica si ya existe en el mapa frequencies. Si no está, su valor inicial es 0. Si ya está, se incrementa en 1 su frecuencia.
        }

        const raiz = this.construirArbolDeHuffman();
        let compressed = "";
        for (let char of arch) {
            compressed += this.tabla.get(char);//agrega bytes en forma de codigo
        }

        // Convertir a Buffer para guardar en archivo
        const buffer = Buffer.alloc(Math.ceil(compressed.length / 8) + this.frequencies.size * 3 + 2);//buffer de size bytes falta la cabecera
        let currentByte = 0;
        let bitCount = 0;

        //agregar cabecera a la tabla (cantidad de pares, caracter, frecuencia)
        var index = 2;
        buffer[0] = this.frequencies.size-1;//almacena el número de caracteres únicos en el archivo
        buffer[1] = 0;//bits a ignorar en la descompresion
        for (let [char, frec] of this.frequencies) {
            buffer[index] = char;
            buffer[index + 1] = (frec >> 8) & 0xFF; // Guardamos el byte alto la parte alta de la frecuencia
            buffer[index + 2] = frec & 0xFF; //byte bajo
            index += 3;
        }

        //Convertir la cadena comprimida a bytes
        for (let i = 0; i < compressed.length; i++) {
            currentByte = (currentByte << 1) | (compressed[i] === "1" ? 1 : 0);
            bitCount++;

            if (bitCount === 8) {
                buffer[index + Math.floor(i / 8)] = currentByte;
                currentByte = 0;
                bitCount = 0;
            }
        }

        // Guardar bits restantes
        if (bitCount > 0) {
            currentByte = currentByte << (8 - bitCount);
            buffer[index + Math.floor(compressed.length / 8)] = currentByte;
            buffer[1] = (8 - bitCount);//bits a ignorar en la descompresion
        }

        return buffer;
    }

    descomprimir(comprimido) {

        //obtenerArbol de comprimido
        this.frequencies = new Map();
        let cursor;

        let headerEnd = (comprimido[0]+1)* 3;
        for (cursor = 2; cursor < headerEnd; cursor += 3) {
            // Guardar el carácter y su frecuencia en el Map
            this.frequencies.set(comprimido[cursor], (comprimido[cursor + 1] << 8) + comprimido[cursor + 2]);
        }
        let tree = this.construirArbolDeHuffman();
        let actual = tree;//raiz del arbol
        let decompressed = "";
        let bytearray = [];
        let bits = "";

        // Convertir el buffer a una string de bits desde el cursor
        while (cursor < comprimido.length) {
            // Convertir cada byte a su representación en bits
            const byte = comprimido[cursor];
            bits += byte.toString(2).padStart(8, '0');
            cursor++; // Mover el cursor al siguiente byte
        }

        bits = (comprimido[1]>0)?bits.slice(0, -comprimido[1]):bits;//ignora los ultimos bits que sobraron de la compresion

        for (let bit of bits) {
            if (bit === "0") {
                actual = actual.left;
            } else {
                actual = actual.right;
            }

            if (actual.caracter !== null) {
                decompressed += actual.caracter;
                bytearray.push(actual.caracter);
                actual = tree;
            }
        }

        bytearray = Buffer.from(bytearray);

        return bytearray;
    }
    calcularEntropia() {
        let simbolosTotales = 0;
        let entropia = 0;

        // Calcular el número total de símbolos
        this.frequencies.forEach((freq) => {
            simbolosTotales += freq;
        });

        // Calcular la entropía
        this.frequencies.forEach((freq) => {
            let probabilidad = freq / simbolosTotales;
            entropia -= probabilidad * Math.log2(probabilidad);
        });

        return entropia;
    }

    // Método para calcular la longitud media
    calcularLongitudMedia() {
        let simbolosTotales = 0;
        let longitudMedia = 0;

        // Calcular el número total de símbolos
        this.frequencies.forEach((freq) => {
            simbolosTotales += freq;
        });

        // Calcular la longitud media ponderada por la probabilidad de cada símbolo
        this.frequencies.forEach((freq, symbol) => {
            let probabilidad = freq / simbolosTotales;
            let code = this.tabla.get(symbol);  // Obtener el código (cadena de texto) para el símbolo
            let codeLength = code.length;       // Longitud del código en bits (número de caracteres en la cadena)
            longitudMedia += probabilidad * codeLength;
        });

        return longitudMedia;
    }
}


// Función principal
function main() {
    const args = process.argv.slice(2);
    var flag1=""; 
    var flag2="";
    var original="";
    var compressed="";
    
    if (args.length < 3) {
        
        console.error(
            "Uso: tpi3 {-c|-d} {archivo_comprimido} {archivo_descomprimido}"
        );
        process.exit(1);
    }else if(args.length === 4){
        flag1 = args[0];
        flag2 = args[1];
        original=args[2];
        compressed=args[3];
        if (flag1 !== "-c" && flag2 !== "-d") {
            console.error(
                "Flag inválido. Use -c para comprimir o -d para descomprimir"
            );
            process.exit(1);
        }
    }else if(args.length === 3){
        flag1 = args[0];
        original=args[1];
        compressed=args[2];
    }


    try {
        const startTime = process.hrtime();
        if (flag1 === "-c") {
            // Comprimir
            const text = fs.readFileSync(original);
            const originalSize = text.length;

            const huffman = new Huffman();

            const huffmanResult = huffman.comprimir(text);

            fs.writeFileSync(compressed, huffmanResult);

            const endTime = process.hrtime(startTime);

            const compressedSize = huffmanResult.length;
            const compressionRatio = originalSize / compressedSize;

            //calcular entropia de huffman
            const entropia = huffman.calcularEntropia();
            const longitudMedia = huffman.calcularLongitudMedia();
            const efficiency = entropia / longitudMedia;
            const redundancy = 1 - efficiency;

            console.log(`\nCompresión completada Escrito en: ${compressed}`);
            console.log(`Tiempo: ${(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(3)}ms`);
            console.log(`Tasa de compresión: ${compressionRatio.toFixed(3)}:1`);
            console.log(`Rendimiento: ${efficiency.toFixed(3)}`);
            console.log(`Redundancia: ${redundancy.toFixed(3)}`);
            console.log('\x1b[32mExtra: \x1b[0m');
            console.log("Entropia Maxima: ", Math.log2(huffman.frequencies.size));
            console.log("Razon Entropia(a menor entropia es mas comprimible): ", entropia / Math.log2(huffman.frequencies.size));
            console.log(`Entropia: ${entropia.toFixed(3)}`);
            console.log(`Longitud media: ${longitudMedia.toFixed(3)}`);
        }
        if (flag2 === "-d" || flag1 === "-d") {
            const originalFile = original;
            const originalName = path.basename(
                originalFile,
                path.extname(originalFile)
            );
            const originalExtension = path.extname(originalFile);

            const descompressedFileName = `${originalName}_descomprimido${originalExtension}`;
            // Descomprimir
            const compressedRead = fs.readFileSync(compressed);

            var decompressed;

            const huffman = new Huffman();
            const startTime = process.hrtime();
            decompressed = huffman.descomprimir(compressedRead);

            fs.writeFileSync(descompressedFileName, decompressed);
            console.log(`\nDescompresión completada Escrito en: ${descompressedFileName}`);
            const endTime = process.hrtime(startTime);

            console.log(
                `Tiempo: ${(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)}ms`
            );
            if(flag1 === "-d"){

                const compressionRatio = decompressed.length / compressedRead.length;
    
                //calcular entropia de huffman
                const entropia = huffman.calcularEntropia();
                const longitudMedia = huffman.calcularLongitudMedia();
                const efficiency = entropia / longitudMedia;
                const redundancy = 1 - efficiency;
    
                console.log(`\nCompresión completada Escrito en: ${compressed}`);
                console.log(`Tiempo: ${(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(3)}ms`);
                console.log(`Tasa de compresión: ${compressionRatio.toFixed(3)}:1`);
                console.log(`Rendimiento: ${efficiency.toFixed(3)}`);
                console.log(`Redundancia: ${redundancy.toFixed(3)}`);
                console.log('\x1b[32mExtra: \x1b[0m');
                console.log("Entropia Maxima: ", Math.log2(huffman.frequencies.size));
                console.log("Razon Entropia(a menor entropia es mas comprimible): ", entropia / Math.log2(huffman.frequencies.size));
                console.log(`Entropia: ${entropia.toFixed(3)}`);
                console.log(`Longitud media: ${longitudMedia.toFixed(3)}`);
            }
        }
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}



main();