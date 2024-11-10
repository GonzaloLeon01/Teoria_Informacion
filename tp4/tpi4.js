const fs = require('fs');

function main() {
    if (process.argv.length !== 5) {
        console.log('Uso: node tpi4.js sent received N');
        process.exit(1);
    }

    const sentFile = process.argv[2];
    const receivedFile = process.argv[3];
    const N = parseInt(process.argv[4]);

    const sentData = fs.readFileSync(sentFile);
    const receivedData = fs.readFileSync(receivedFile);

    const sentEntropy = calculateEntropy(sentData);
    console.log('\na. Entropía de la fuente binaria:', sentEntropy.toFixed(4), 'bits');

    // Crear matrices para datos enviados (calculando bits de paridad)
    const sentMatrices = createParityMatrices(sentData, N);
    
    // Cargar matrices para datos recibidos (con bits de paridad incluidos)
    const receivedMatrices = loadReceivedMatrices(receivedData, N);

    // Estimar matriz de probabilidades del canal
    const channelMatrix = estimateChannelMatrix(sentMatrices, receivedMatrices);
    console.log('\nc. Matriz de probabilidades del canal:');
    printChannelMatrix(channelMatrix);

    // Analizar mensajes
    const messageAnalysis = analyzeReceivedMessages(receivedMatrices, N);
    printMessageAnalysis(messageAnalysis);

    // Calcular métricas
    const metrics = calculateChannelMetrics(channelMatrix, sentEntropy);
    printMetrics(metrics);
}

/*
Cargar las matrices de sentFile y receivedFile
*/
//Matrices del mensaje enviado
function createParityMatrices(data, N) {
    const matrices = [];
    const totalBits = data.length * 8;
    const matrixSize = N * N;
    const totalMatrices = Math.ceil(totalBits / matrixSize);
    console.log(`${data}  ${totalBits} ${matrixSize} ${totalMatrices}`);
    let bitIndex = 0;
    for (let m = 0; m < totalMatrices; m++) {
        // Crear matriz (N+1)x(N+1) inicializada con ceros
        const matrix = Array(N + 1).fill().map(() => Array(N + 1).fill(0));
        
        // Llenar la matriz NxN con los bits de datos
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
        console.log(`${matrix}`);
        // Calcular bits de paridad de filas (última columna)
        for (let i = 0; i < N; i++) {
            let rowParity = matrix[i][0];
            for (let j = 1; j < N; j++) {
                rowParity ^= matrix[i][j];  //XOR
            }
            matrix[i][N] = rowParity;
        }
        console.log(`${matrix}`);
        // Calcular bits de paridad de columnas (última fila)
        for (let j = 0; j < N; j++) {
            let colParity = matrix[0][j];
            for (let i = 1; i < N; i++) {
                colParity ^= matrix[i][j];
            }
            matrix[N][j] = colParity;
        }
        console.log(`${matrix}`);
        // Calcular bit de paridad total (esquina inferior derecha: A.K.A: ultimo elemento)
        let totalParity = matrix[0][N];
        // XOR de los bits de paridad de filas
        for (let i = 1; i < N; i++) {
            totalParity ^= matrix[i][N];
        }
        matrix[N][N] = totalParity;
        console.log(`${matrix}`);
        matrices.push(matrix);
    }

    return matrices;
}
//Matrices de archivo recibido
function loadReceivedMatrices(data, N) {
    const matrices = [];
    const bitsPerMatrix = (N+1)**2; // N+1 filas con N+1 bits cada una
    const totalBits = data.length * 8;
    const totalMatrices = Math.floor(totalBits / bitsPerMatrix);

    let bitIndex = 0;
    for (let m = 0; m < totalMatrices; m++) {
        // Crear matriz (N+1)x(N+1)
        const matrix = Array(N + 1).fill().map(() => Array(N + 1).fill(0));
        
        // Leer N+1 filas, cada una con N+1 bits (N bits de datos + 1 bit de paridad, ultima fila = bits de paridad)
        for (let i = 0; i <= N; i++) {
            // Leer N bits de datos + 1 bit de paridad para cada fila
            for (let j = 0; j <= N; j++) {
                if (bitIndex < totalBits) {
                    const byteIndex = Math.floor(bitIndex / 8);
                    const bit = (data[byteIndex] >> (bitIndex % 8)) & 1;
                    matrix[i][j] = bit;
                }
                bitIndex++;
            }
        }
        matrices.push(matrix);
    }

    return matrices;
}
//Matriz del canal
function estimateChannelMatrix(sentMatrices, receivedMatrices) {
    const transitions = {
        '0->0': 0,
        '0->1': 0,
        '1->0': 0,
        '1->1': 0
    };
    
    let totalBits = 0;

    // Comparar solo los bits de datos (no los de paridad)
    const minMatrices = Math.min(sentMatrices.length, receivedMatrices.length);
    for (let m = 0; m < minMatrices; m++) {
        const N = sentMatrices[m].length - 1; // Tamaño real de la matriz de datos
        
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const sentBit = sentMatrices[m][i][j];
                const receivedBit = receivedMatrices[m][i][j];
                
                const key = `${sentBit}->${receivedBit}`;
                transitions[key]++;
                totalBits++;
            }
        }
    }

    // Calcular probabilidades
    const channelMatrix = [
        [transitions['0->0'] / totalBits, transitions['0->1'] / totalBits],
        [transitions['1->0'] / totalBits, transitions['1->1'] / totalBits]
    ];

    return channelMatrix;
}

/*
Calculo de matrices recibidas correctas
*/
//Funcion analizadora
function analyzeReceivedMessages(matrices, N) {
    let correct = 0;
    let errors = 0;
    let corregible=0;

    for (let m = 0; m < matrices.length; m++) {
        const matrix = matrices[m];
        const result = checkMatrixParity(matrix, N);

        if (result.isCorrect) {
            correct++;
        }
        else if (result.isCorrectible){
            corregible++;
            errors++;
        }
        else{
            errors++;    
        }
    }

    return { 
        correct, 
        errors, 
        corregible,
        totalMatrices: matrices.length
    };
}
//Verifica si la matriz es correcta, si tiene un error (y si este es reparable), si tiene muchos errores y no es reparable
function checkMatrixParity(matrix, N) {
    let errorRows = [];
    let errorCols = [];

    // Verificar paridad de filas
    for (let i = 0; i < N; i++) {
        let rowXOR = matrix[i][0];
        // XOR de todos los bits de la fila incluyendo el bit de paridad
        for (let j = 1; j <= N; j++) {
            rowXOR ^= matrix[i][j];
        }
        if (rowXOR !== 0) {
            errorRows.push(i);
        }
    }

    // Verificar paridad de columnas
    for (let j = 0; j < N; j++) {
        let colXOR = matrix[0][j];
        // XOR de todos los bits de la columna incluyendo el bit de paridad
        for (let i = 1; i <= N; i++) {
            colXOR ^= matrix[i][j];
        }
        if (colXOR !== 0) {
            errorCols.push(j);
        }
    }

    // Si no hay errores
    if (errorRows.length === 0 && errorCols.length === 0) {
        return {
            isCorrect: true,
            isCorrectible: false
        };
    }

    // Si hay exactamente un error (un par i,j)
    if (errorRows.length === 1 && errorCols.length === 1) {
        return {
            isCorrect: false,
            isCorrectible: true,
        };
    }

    // Si hay multiples errores
    return {
        isCorrect: false,
        isCorrectible: false,
    };
}


/*
 Calculos
 */

// Funcion para calcular la entropia de una fuente binaria
function calculateEntropy(data) {
    const frequencies = new Map();
    const totalBits = data.length * 8;  // Total de bits en el archivo
    // Contar las frecuencias de 0s y 1s en el archivo
    for (let byte of data) {
        for (let i = 0; i < 8; i++) {
            const bit = (byte >> i) & 1;
            frequencies.set(bit, (frequencies.get(bit) || 0) + 1);
        }
    }

    // Calcular la entropia usando la fórmula de Shannon
    let entropy = 0;
    for (let [_, freq] of frequencies) {
        const probability = freq / totalBits;
        entropy -= probability * Math.log2(probability);
    }

    return entropy;
}

// Funcion para calcular metricas del canal
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

// Funcion para calcular la entropia a posteriori
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

// Funcion para calcular la equivocacion
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

// Funciones de impresion
function printChannelMatrix(matrix) {
    console.log('P(y|x):\n');
    console.log('     y=0      y=1');
    console.log(`x=0  ${matrix[0][0].toFixed(4)}  ${matrix[0][1].toFixed(4)}`);
    console.log(`x=1  ${matrix[1][0].toFixed(4)}  ${matrix[1][1].toFixed(4)}\n`);
}

function printMessageAnalysis(analysis) {
    console.log('\nd - Análisis de mensajes:');
    console.log(`Total de matrices analizadas: ${analysis.totalMatrices}`);
    console.log(`- Matrices correctas: ${analysis.correct}`);
    console.log(`- Matrices con errores no corregibles: ${analysis.errors}`);
    console.log(`- Matrices con errores corregibles: ${analysis.corregible}`);
}


function printMetrics(metrics) {
    console.log('\ne. Métricas del canal:');
    console.log(`- Entropía a priori: ${metrics.prioriEntropy.toFixed(4)} bits`);
    console.log(`- Entropía a posteriori: ${metrics.posterioriEntropy.toFixed(4)} bits`);
    console.log(`- Equivocación: ${metrics.equivocation.toFixed(4)} bits`);
    console.log(`- Información mutua: ${metrics.mutualInformation.toFixed(4)} bits`);
}

// Ejecutar el programa
main();