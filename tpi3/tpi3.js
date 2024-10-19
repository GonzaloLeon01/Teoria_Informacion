#!/usr/bin/env node

const fs = require("fs");

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
    //metadatos
    this.tabla = new Map();
    this.frequencies = new Map();
    //entropia
  }

  construirArbolDeHuffman() {
    //mod
    // Crear nodos iniciales
    const nodosHuffman = Array.from(this.frequencies.entries()).map(
      ([char, frecuencia]) => new Nodo(char, frecuencia)
    );
    //////////////////////////////////////
    ////muestra
    //console.log(this.frequencies);
    nodosHuffman.sort((a, b) => b.frecuencia - a.frecuencia); //borrar
    console.log(nodosHuffman);
    //////////////////////////////////////

    // Construir árbol
    while (nodosHuffman.length > 1) {
      //por alguna razon lo hace mal
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

    //////////////////////////////////////////////
    let tablaOrdenada = Array.from(this.tabla).sort(
      (a, b) => a[1].length - b[1].length
    );

    // Mostrar los elementos ordenados por la longitud del código
    console.log("Contenido de la tabla ordenada por longitud del código:");
    tablaOrdenada.forEach(([char, code], index) => {
      console.log(
        `Elemento ${index}: Caracter = ${char}, Código = ${code}, Longitud = ${code.length}`
      );
    });
    //////////////////////////////////////////////d

    return nodosHuffman[0];
  }

  generarCodigos(node, codigo) {
    if (node != null) {
      //console.log("aaca1");
      if (node.caracter !== null) {
        //console.log("aaca2");
        this.tabla.set(node.caracter, codigo);
        return;
      }
      this.generarCodigos(node.left, codigo + "0");
      this.generarCodigos(node.right, codigo + "1");
    }
  }

  comprimir(arch) {
    // Calcular frecuencias
    //const frequencies = new Map();
    for (let char of arch) {
      this.frequencies.set(char, (this.frequencies.get(char) || 0) + 1); //Para cada carácter (char) en el archivo, se verifica si ya existe en el mapa frequencies. Si no está, su valor inicial es 0. Si ya está, se incrementa en 1 su frecuencia.
    }
    const raiz = this.construirArbolDeHuffman();
    let compressed = "";
    for (let char of arch) {
      compressed += this.tabla.get(char); //agrega bytes en forma de codigo
    }
    //console.log(compressed);
    // Convertir a Buffer para guardar en archivo
    const buffer = Buffer.alloc(
      Math.ceil(compressed.length / 8) + this.frequencies.size * 3 + 1
    ); //buffer de size bytes falta la cabecera
    let currentByte = 0;
    let bitCount = 0;

    //agregar cabecera a la tabla (cantidad de pares, caracter, frecuencia)
    var index = 1;
    buffer[0] = this.frequencies.size - 1; //almacena el número de caracteres únicos en el archivo
    for (let [char, frec] of this.frequencies) {
      buffer[index] = char;
      buffer[index + 1] = (frec >> 8) & 0xff; // Guardamos el byte alto la parte alta de la frecuencia
      buffer[index + 2] = frec & 0xff; //byte bajo
      index += 3;
    }
    console.log(buffer);

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
    }
    console.log(buffer);

    return buffer;
  }

  descomprimir(comprimido) {
    //console.log(comprimido);
    //obtenerArbol de comprimido
    //const comprimido = fs.readFileSync(originalPath)
    this.frequencies = new Map();
    let cursor = 1;
    for (cursor = 1; cursor < (comprimido[0] + 1) * 3; cursor += 3) {
      // Guardar el carácter y su frecuencia en el Map
      this.frequencies.set(
        comprimido[cursor],
        (comprimido[cursor + 1] << 8) + comprimido[cursor + 2]
      );
    }
    console.log(this.frequencies);
    let tree = this.construirArbolDeHuffman();
    let actual = tree; //raiz del arbol
    let decompressed = "";
    let bytearray = [];
    let bits = "";

    // Convertir el buffer a una string de bits desde el cursor
    while (cursor < comprimido.length) {
      // Convertir cada byte a su representación en bits
      const byte = comprimido[cursor];
      bits += byte.toString(2).padStart(8, "0");
      cursor++; // Mover el cursor al siguiente byte
    }
    //console.log(bits);
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
    //console.log(decompressed);
    bytearray = Buffer.from(bytearray);
    //console.log(bytearray);

    return bytearray;
  }
  calculateEntropy() {
    let totalSymbols = 0;
    let entropy = 0;

    // Calcular el número total de símbolos
    this.frequencies.forEach((freq) => {
      totalSymbols += freq;
    });

    // Calcular la entropía
    this.frequencies.forEach((freq) => {
      let probability = freq / totalSymbols;
      entropy -= probability * Math.log2(probability);
    });

    return entropy;
  }

  // Método para calcular la longitud media
  calculateMeanLength() {
    let totalSymbols = 0;
    let meanLength = 0;

    // Calcular el número total de símbolos
    this.frequencies.forEach((freq) => {
      totalSymbols += freq;
    });

    // Calcular la longitud media ponderada por la probabilidad de cada símbolo
    this.frequencies.forEach((freq, symbol) => {
      let probability = freq / totalSymbols;
      let code = this.tabla.get(symbol); // Obtener el código (cadena de texto) para el símbolo
      let codeLength = code.length; // Longitud del código en bits (número de caracteres en la cadena)
      meanLength += probability * codeLength;
    });

    return meanLength;
  }
}

// Función principal
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 4) {
    console.error(
      "Uso: tpi3 {-c|-d} {archivo_comprimido} {archivo_descomprimido}"
    );
    process.exit(1);
  }

  const [flag1, flag2, original, compressed] = args;
  if (flag1 !== "-c" && flag2 !== "-d") {
    console.error(
      "Flag inválido. Use -c para comprimir o -d para descomprimir"
    );
    process.exit(1);
  }

  try {
    const startTime = process.hrtime();
    if (flag1 === "-c") {
      console.log(flag1);
      // Comprimir
      const text = fs.readFileSync(original);
      const originalSize = Buffer.from(text).length; //ya es un buffer nose si es necesario transformarlo

      const huffman = new Huffman();

      const huffmanResult = huffman.comprimir(text);

      fs.writeFileSync(compressed, huffmanResult);

      const endTime = process.hrtime(startTime);

      const compressedSize = huffmanResult.length;
      const compressionRatio = originalSize / compressedSize;

      //calcular entropia de huffman

      const efficiency =
        huffman.calculateEntropy() / huffman.calculateMeanLength(); //Math.log2(compressionRatio);//
      const redundancy = 1 - efficiency;

      console.log(`\nCompresión completada`);
      console.log(
        `Tiempo: ${(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(3)}ms`
      );
      console.log(`Tasa de compresión: ${compressionRatio.toFixed(3)}:1`);
      console.log(`Entropia: ${huffman.calculateEntropy().toFixed(3)}`);
      console.log(
        `Longitud media: ${huffman.calculateMeanLength().toFixed(3)}`
      );
      console.log(`Rendimiento: ${efficiency.toFixed(3)}`);
      console.log(`Redundancia: ${redundancy.toFixed(3)}`);
    }
    if (flag2 === "-d") {
      // Descomprimir
      console.log(flag2);
      const compressed2 = fs.readFileSync(compressed);

      let decompressed;

      const huffman = new Huffman();
      const startTime = process.hrtime();
      decompressed = huffman.descomprimir(compressed2);

      fs.writeFileSync("descomprimido" /*originalPath*/, decompressed);

      const endTime = process.hrtime(startTime);

      console.log(
        `Tiempo: ${(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)}ms`
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
