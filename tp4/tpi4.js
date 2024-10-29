const fs = require('fs');

// Función principal que maneja la ejecución del programa
function main() {
    // Verificar argumentos de línea de comandos
    if (process.argv.length !== 5) {
        console.log('Uso: node tpi4.js sent received N');
        process.exit(1);
    }

    const sentFile = process.argv[2];
    const receivedFile = process.argv[3];
    const N = parseInt(process.argv[4]);

    // Leer archivos binarios
    const sentData = fs.readFileSync(sentFile);
    const receivedData = fs.readFileSync(receivedFile);

    // 1. Calcular entropía de la fuente binaria
    const sentEntropy = calculateEntropy(sentData);
    console.log('\n1. Entropía de la fuente binaria:', sentEntropy.toFixed(4), 'bits');

    // 2. Aplicar paridad cruzada
    const { matrices, parityCodes } = applyCrossParityToData(sentData, N);

    // 3. Estimar matriz de probabilidades del canal
    const channelMatrix = estimateChannelMatrix(parityCodes, receivedData);
    console.log('\n3. Matriz de probabilidades del canal:');
    printChannelMatrix(channelMatrix);

    // 4. Analizar mensajes
    const messageAnalysis = analyzeMessages(matrices, parityCodes, receivedData, N);
    printMessageAnalysis(messageAnalysis);

    // 5. Calcular entropías y métricas relacionadas
    const metrics = calculateChannelMetrics(channelMatrix, sentEntropy);
    printMetrics(metrics);
}

// Función para calcular la entropía
function calculateEntropy(data) {
    const frequencies = new Map();
    const totalBits = data.length * 8;

    // Contar frecuencias de 0s y 1s
    for (let byte of data) {
        for (let i = 0; i < 8; i++) {
            const bit = (byte >> i) & 1;
            frequencies.set(bit, (frequencies.get(bit) || 0) + 1);
        }
    }

    // Calcular entropía
    let entropy = 0;
    for (let [_, freq] of frequencies) {
        const probability = freq / totalBits;
        entropy -= probability * Math.log2(probability);
    }

    return entropy;
}

// Función para aplicar paridad cruzada
function applyCrossParityToData(data, N) {
    const matrices = [];
    const parityCodes = [];
    const totalBits = data.length * 8;
    const matrixSize = N * N;
    const totalMatrices = Math.ceil(totalBits / matrixSize);

    let bitIndex = 0;
    for (let m = 0; m < totalMatrices; m++) {
        // Crear matriz NxN
        const matrix = Array(N).fill().map(() => Array(N).fill(0));
        
        // Llenar matriz con bits
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (bitIndex < totalBits) {
                    const byteIndex = Math.floor(bitIndex / 8);
                    const bit = (data[byteIndex] >> (bitIndex % 8)) & 1;
                    matrix[i][j] = bit;
                }
                bitIndex++;
            }
        }

        // Calcular paridades
        const parityCode = calculateParityCode(matrix, N);
        
        matrices.push(matrix);
        parityCodes.push(parityCode);
    }

    return { matrices, parityCodes };
}

// Función para calcular código de paridad de una matriz
function calculateParityCode(matrix, N) {
    const parityCode = {
        rows: Array(N).fill(0),
        cols: Array(N).fill(0),
        total: 0
    };

    // Calcular paridades de filas y columnas
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            parityCode.rows[i] ^= matrix[i][j];
            parityCode.cols[j] ^= matrix[i][j];
        }
    }

    // Calcular paridad total
    for (let i = 0; i < N; i++) {
        parityCode.total ^= parityCode.rows[i];
    }

    return parityCode;
}

// Función para estimar la matriz de probabilidades del canal
function estimateChannelMatrix(parityCodes, receivedData) {
    const transitions = {
        '0->0': 0,
        '0->1': 0,
        '1->0': 0,
        '1->1': 0
    };
    
    let totalBits = 0;
    let receivedBitIndex = 0;

    // Contar transiciones
    for (let code of parityCodes) {
        for (let i = 0; i < code.rows.length; i++) {
            const sentBit = code.rows[i];
            const receivedBit = (receivedData[Math.floor(receivedBitIndex/8)] >> (receivedBitIndex % 8)) & 1;
            
            const key = `${sentBit}->${receivedBit}`;
            transitions[key]++;
            totalBits++;
            receivedBitIndex++;
        }
    }

    // Calcular probabilidades
    const channelMatrix = [
        [transitions['0->0'] / totalBits, transitions['0->1'] / totalBits],
        [transitions['1->0'] / totalBits, transitions['1->1'] / totalBits]
    ];

    return channelMatrix;
}

// Función para analizar mensajes
function analyzeMessages(matrices, parityCodes, receivedData, N) {
    let correct = 0;
    let errors = 0;
    let corrected = 0;

    let receivedBitIndex = 0;
    
    for (let i = 0; i < matrices.length; i++) {
        const receivedMatrix = Array(N).fill().map(() => Array(N).fill(0));
        
        // Reconstruir matriz recibida
        for (let row = 0; row < N; row++) {
            for (let col = 0; col < N; col++) {
                if (receivedBitIndex < receivedData.length * 8) {
                    receivedMatrix[row][col] = 
                        (receivedData[Math.floor(receivedBitIndex/8)] >> (receivedBitIndex % 8)) & 1;
                    receivedBitIndex++;
                }
            }
        }

        const receivedParityCode = calculateParityCode(receivedMatrix, N);
        
        if (compareParityCodes(parityCodes[i], receivedParityCode)) {
            correct++;
        } else {
            const canCorrect = attemptCorrection(receivedMatrix, parityCodes[i], N);
            if (canCorrect) {
                corrected++;
            } else {
                errors++;
            }
        }
    }

    return { correct, errors, corrected };
}

// Función para comparar códigos de paridad
function compareParityCodes(code1, code2) {
    return code1.total === code2.total &&
           code1.rows.every((val, idx) => val === code2.rows[idx]) &&
           code1.cols.every((val, idx) => val === code2.cols[idx]);
}

// Función para intentar corregir errores
function attemptCorrection(matrix, originalParityCode, N) {
    // Implementación simple de corrección de errores
    // En un caso real, se implementaría un algoritmo más sofisticado
    return false;
}

// Función para calcular métricas del canal
function calculateChannelMetrics(channelMatrix, prioriEntropy) {
    const posterioriEntropy = calculatePosterioriEntropy(channelMatrix);
    const equivocation = calculateEquivocation(channelMatrix);
    const mutualInformation = prioriEntropy - equivocation;

    return {
        prioriEntropy,
        posterioriEntropy,
        equivocation,
        mutualInformation
    };
}

// Función para calcular la entropía a posteriori
function calculatePosterioriEntropy(channelMatrix) {
    let entropy = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            if (channelMatrix[i][j] > 0) {
                entropy -= channelMatrix[i][j] * Math.log2(channelMatrix[i][j]);
            }
        }
    }
    return entropy;
}

// Función para calcular la equivocación
function calculateEquivocation(channelMatrix) {
    let H = 0;
    for (let i = 0; i < 2; i++) {
        const rowSum = channelMatrix[i].reduce((a, b) => a + b, 0);
        if (rowSum > 0) {
            for (let j = 0; j < 2; j++) {
                if (channelMatrix[i][j] > 0) {
                    H -= channelMatrix[i][j] * Math.log2(channelMatrix[i][j] / rowSum);
                }
            }
        }
    }
    return H;
}

// Funciones de impresión
function printChannelMatrix(matrix) {
    console.log('P(y|x):\n');
    console.log('     y=0    y=1');
    console.log(`x=0  ${matrix[0][0].toFixed(4)}  ${matrix[0][1].toFixed(4)}`);
    console.log(`x=1  ${matrix[1][0].toFixed(4)}  ${matrix[1][1].toFixed(4)}\n`);
}

function printMessageAnalysis(analysis) {
    console.log('\n4. Análisis de mensajes:');
    console.log(`- Mensajes correctos: ${analysis.correct}`);
    console.log(`- Mensajes con errores: ${analysis.errors}`);
    console.log(`- Mensajes corregidos: ${analysis.corrected}`);
}

function printMetrics(metrics) {
    console.log('\n5. Métricas del canal:');
    console.log(`- Entropía a priori: ${metrics.prioriEntropy.toFixed(4)} bits`);
    console.log(`- Entropía a posteriori: ${metrics.posterioriEntropy.toFixed(4)} bits`);
    console.log(`- Equivocación: ${metrics.equivocation.toFixed(4)} bits`);
    console.log(`- Información mutua: ${metrics.mutualInformation.toFixed(4)} bits`);
}

// Ejecutar el programa
main();