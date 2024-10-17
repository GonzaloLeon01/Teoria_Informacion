#!/usr/bin/env node

const fs = require('fs');

// Clase para nodos del árbol de Huffman
class HuffmanNode {
    constructor(char, freq) {
        this.char = char;
        this.freq = freq;
        this.left = null;
        this.right = null;
    }
}

// Implementación del algoritmo de Huffman
class HuffmanCoding {
    constructor() {
        this.codes = new Map();
    }

    buildHuffmanTree(text) {
        // Calcular frecuencias
        const frequencies = new Map();
        for (let char of text) {
            frequencies.set(char, (frequencies.get(char) || 0) + 1);
        }

        // Crear nodos iniciales
        const nodes = Array.from(frequencies.entries()).map(
            ([char, freq]) => new HuffmanNode(char, freq)
        );

        // Construir árbol
        while (nodes.length > 1) {
            nodes.sort((a, b) => a.freq - b.freq);
            const left = nodes.shift();
            const right = nodes.shift();
            const parent = new HuffmanNode(null, left.freq + right.freq);
            parent.left = left;
            parent.right = right;
            nodes.push(parent);
        }

        // Generar códigos
        this.generateCodes(nodes[0], "");
        return nodes[0];
    }

    generateCodes(node, code) {
        if (node.char !== null) {
            this.codes.set(node.char, code);
            return;
        }
        this.generateCodes(node.left, code + "0");
        this.generateCodes(node.right, code + "1");
    }

    compress(text) {
        const root = this.buildHuffmanTree(text);
        let compressed = "";
        for (let char of text) {
            compressed += this.codes.get(char);
        }
        
        // Convertir a Buffer para guardar en archivo
        const buffer = Buffer.alloc(Math.ceil(compressed.length / 8) + 1);
        let currentByte = 0;
        let bitCount = 0;
        
        for (let i = 0; i < compressed.length; i++) {
            currentByte = (currentByte << 1) | (compressed[i] === "1" ? 1 : 0);
            bitCount++;
            
            if (bitCount === 8) {
                buffer[Math.floor(i / 8)] = currentByte;
                currentByte = 0;
                bitCount = 0;
            }
        }
        
        // Guardar bits restantes
        if (bitCount > 0) {
            currentByte = currentByte << (8 - bitCount);
            buffer[Math.floor(compressed.length / 8)] = currentByte;
        }
        
        return {
            data: buffer,
            tree: root,
            codes: this.codes
        };
    }

    decompress(compressed, tree) {
        let current = tree;
        let decompressed = "";
        let bits = "";
        
        // Convertir buffer a string de bits
        for (let byte of compressed) {
            bits += byte.toString(2).padStart(8, '0');
        }
        
        for (let bit of bits) {
            if (bit === "0") {
                current = current.left;
            } else {
                current = current.right;
            }
            
            if (current.char !== null) {
                decompressed += current.char;
                current = tree;
            }
        }
        
        return decompressed;
    }
}

// Implementación del algoritmo Shannon-Fano
class ShannonFano {
    constructor() {
        this.codes = new Map();
    }

    buildShannonFanoCodes(chars, freqs, start, end) {
        if (start === end) {
            return;
        }
        if (end - start === 1) {
            return;
        }

        // Encontrar punto de división
        let totalFreq = 0;
        for (let i = start; i <= end; i++) {
            totalFreq += freqs[i];
        }

        let currentFreq = 0;
        let splitIndex = start;
        let minDiff = totalFreq;

        for (let i = start; i <= end; i++) {
            currentFreq += freqs[i];
            let diff = Math.abs(totalFreq - 2 * currentFreq);
            if (diff < minDiff) {
                minDiff = diff;
                splitIndex = i;
            }
        }

        // Asignar códigos
        for (let i = start; i <= end; i++) {
            let currentCode = this.codes.get(chars[i]) || "";
            this.codes.set(chars[i], currentCode + (i <= splitIndex ? "0" : "1"));
        }

        // Recursión
        this.buildShannonFanoCodes(chars, freqs, start, splitIndex);
        this.buildShannonFanoCodes(chars, freqs, splitIndex + 1, end);
    }

    compress(text) {
        // Calcular frecuencias
        const frequencies = new Map();
        for (let char of text) {
            frequencies.set(char, (frequencies.get(char) || 0) + 1);
        }

        const chars = Array.from(frequencies.keys());
        const freqs = Array.from(frequencies.values());

        // Construir códigos
        this.buildShannonFanoCodes(chars, freqs, 0, chars.length - 1);

        // Comprimir
        let compressed = "";
        for (let char of text) {
            compressed += this.codes.get(char);
        }

        // Convertir a Buffer
        const buffer = Buffer.alloc(Math.ceil(compressed.length / 8) + 1);
        let currentByte = 0;
        let bitCount = 0;

        for (let i = 0; i < compressed.length; i++) {
            currentByte = (currentByte << 1) | (compressed[i] === "1" ? 1 : 0);
            bitCount++;

            if (bitCount === 8) {
                buffer[Math.floor(i / 8)] = currentByte;
                currentByte = 0;
                bitCount = 0;
            }
        }

        if (bitCount > 0) {
            currentByte = currentByte << (8 - bitCount);
            buffer[Math.floor(compressed.length / 8)] = currentByte;
        }

        return {
            data: buffer,
            codes: this.codes
        };
    }

    decompress(compressed, codes) {
        let bits = "";
        let decompressed = "";
        const reverseMap = new Map();

        // Crear mapa inverso
        for (let [char, code] of codes) {
            reverseMap.set(code, char);
        }

        // Convertir buffer a bits
        for (let byte of compressed) {
            bits += byte.toString(2).padStart(8, '0');
        }

        let currentCode = "";
        for (let bit of bits) {
            currentCode += bit;
            if (reverseMap.has(currentCode)) {
                decompressed += reverseMap.get(currentCode);
                currentCode = "";
            }
        }

        return decompressed;
    }
}

// Implementación del algoritmo RLC
class RLC {
    compress(text) {
        let compressed = [];
        let count = 1;
        let current = text[0];

        for (let i = 1; i < text.length; i++) {
            if (text[i] === current) {
                count++;
            } else {
                compressed.push([current, count]);
                current = text[i];
                count = 1;
            }
        }
        compressed.push([current, count]);

        // Convertir a buffer
        const buffer = Buffer.from(JSON.stringify(compressed));
        return buffer;
    }

    decompress(compressed) {
        const data = JSON.parse(compressed.toString());
        let decompressed = "";
        
        for (let [char, count] of data) {
            decompressed += char.repeat(count);
        }
        
        return decompressed;
    }
}

// Función principal
function main() {
    const args = process.argv.slice(2);
    
    if (args.length !== 3) {
        console.error('Uso: tpi3 {-c|-d} original compressed');
        process.exit(1);
    }

    const [flag, originalPath, compressedPath] = args;
    
    if (flag !== '-c' && flag !== '-d') {
        console.error('Flag inválido. Use -c para comprimir o -d para descomprimir');
        process.exit(1);
    }

    try {
        const startTime = process.hrtime();

        if (flag === '-c') {
            // Comprimir
            const text = fs.readFileSync(originalPath, 'utf8');
            const originalSize = Buffer.from(text).length;

            // Usar los tres algoritmos y elegir el mejor resultado
            const huffman = new HuffmanCoding();
            const shannonFano = new ShannonFano();
            const rlc = new RLC();

            const huffmanResult = huffman.compress(text);
            const shannonResult = shannonFano.compress(text);
            const rlcResult = rlc.compress(text);

            // Comparar tamaños y elegir el mejor
            const results = [
                { name: 'Huffman', data: huffmanResult.data, meta: huffmanResult },
                { name: 'Shannon-Fano', data: shannonResult.data, meta: shannonResult },
                { name: 'RLC', data: rlcResult, meta: null }
            ];

            results.sort((a, b) => a.data.length - b.data.length);
            const best = results[0];

            // Guardar resultado comprimido con metadatos
            const metadata = {
                algorithm: best.name,
                meta: best.meta
            };

            const finalBuffer = Buffer.concat([
                Buffer.from(JSON.stringify(metadata)),
                Buffer.from([0]), // separador
                best.data
            ]);

            fs.writeFileSync(compressedPath, finalBuffer);

            const endTime = process.hrtime(startTime);
            const compressedSize = finalBuffer.length;
            const compressionRatio = originalSize / compressedSize;
            const efficiency = Math.log2(compressionRatio);
            const redundancy = 1 - efficiency;

            console.log(`\nCompresión completada usando ${best.name}`);
            console.log(`Tiempo: ${(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)}ms`);
            console.log(`Tasa de compresión: ${compressionRatio.toFixed(2)}:1`);
            console.log(`Rendimiento: ${efficiency.toFixed(2)}`);
            console.log(`Redundancia: ${redundancy.toFixed(2)}`);

        } else {
            // Descomprimir
            const compressed = fs.readFileSync(compressedPath);
            
            // Separar metadata y datos
            const separatorIndex = compressed.indexOf(0);
            const metadata = JSON.parse(compressed.slice(0, separatorIndex).toString());
            const data = compressed.slice(separatorIndex + 1);

            let decompressed;
            switch (metadata.algorithm) {
                case 'Huffman':
                    const huffman = new HuffmanCoding();
                    decompressed = huffman.decompress(data, metadata.meta.tree);
                    break;
                case 'Shannon-Fano':
                    const shannonFano = new ShannonFano();
                    decompressed = shannonFano.decompress(data, metadata.meta.codes);
                    break;
                case 'RLC':
                    const rlc = new RLC();
                    decompressed = rlc.decompress(data);
                    break;
            }

            fs.writeFileSync(originalPath, decompressed);

            const endTime = process.hrtime(startTime);
            console.log(`\nDescompresión completada usando ${metadata.algorithm}`);
            console.log(`Tiempo: ${(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)}ms`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();