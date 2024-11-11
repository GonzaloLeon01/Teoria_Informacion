const fs = require('fs');

function binaryStringToFile(binaryString, fileName) {
    // Asegúrate de que la cadena binaria tenga un número de bits múltiplo de 8
    if (binaryString.length % 8 !== 0) {
        const padding = 8 - (binaryString.length % 8);
        binaryString = binaryString.padEnd(binaryString.length + padding, '0'); // Rellena con ceros al final
        console.log(`Cadena binaria rellenada con ${padding} ceros.`);
    }

    const buffer = Buffer.alloc(binaryString.length / 8);  // Crea un buffer de tamaño adecuado

    // Convierte la cadena binaria en un buffer
    for (let i = 0; i < binaryString.length; i += 8) {
        const byte = binaryString.slice(i, i + 8);
        buffer[i / 8] = parseInt(byte, 2);  // Convierte cada byte binario a un valor decimal
    }

    // Escribe el archivo binario
    fs.writeFile(fileName, buffer, (err) => {
        if (err) {
            console.error('Error al escribir el archivo:', err);
        } else {
            console.log(`Archivo binario "${fileName}" creado con éxito.`);
        }
    });
}

// Ejemplo de uso
const binaryString = "11010101011011001110101010000000"; // La cadena binaria de entrada 1101010101101100111010101 1100010111101000111110100
const fileName = "recibed.bin"; // El nombre del archivo binario de salida

binaryStringToFile(binaryString, fileName);