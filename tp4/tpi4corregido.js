const fs = require('fs');

function main() {
    if (process.argv.length !== 5) {
        console.log('Uso: node tpi4.js sent received N');
        process.exit(1);
    }

    const sentFile = process.argv[2];
    const receivedFile = process.argv[3];
    const N = parseInt(process.argv[4]);
    if (N < 1) {
        console.log('Uso: N debe ser mayor a 0');
        process.exit(1);
    }
    const sentData = fs.readFileSync(sentFile);
    const receivedData = fs.readFileSync(receivedFile);

    const sentEntropyAndProbs = calculateEntropyAndProbabilities(sentData);
    console.log('\na. Entropía de la fuente binaria:', sentEntropyAndProbs.entropy.toFixed(4), 'bits');

    // Crear matrices para datos enviados (calculando bits de paridad)
    const sentMatrices = createParityMatrices(sentData, N);

    // Cargar matrices para datos recibidos (con bits de paridad incluidos)
    const receivedMatrices = loadReceivedMatrices(receivedData, N);

    // Calcular la entropia a priori H(A) considerando todos los bits (incluyendo paridad)
    const channelInputProbs = calculateChannelInputProbabilities(sentMatrices);
    const channelInputEntropy = calculateEntropy(channelInputProbs);

    // Estimar matriz de probabilidades del canal (incluyendo bits de paridad)
    const channelMatrix = estimateChannelMatrix(sentMatrices, receivedMatrices);
    console.log('\nc. Matriz de probabilidades del canal:');
    printChannelMatrix(channelMatrix);

    // Analizar mensajes
    const messageAnalysis = analyzeReceivedMessages(sentMatrices, receivedMatrices, N);
    printMessageAnalysis(messageAnalysis);

    // Calcular metricas
    const metrics = calculateChannelMetrics(channelMatrix, channelInputProbs, channelInputEntropy);
    printMetrics(metrics);
}

function calculateEntropyAndProbabilities(data) {
    const frequencies = new Map();
    const totalBits = data.length * 8;  // Total de bits en el archivo

    // Inicializar frecuencias para ambos bits (0 y 1)
    frequencies.set(0, 0);
    frequencies.set(1, 0);

    // Contar las frecuencias de 0s y 1s en el archivo
    for (let byte of data) {
        for (let i = 0; i < 8; i++) {
            const bit = (byte >> i) & 1;
            frequencies.set(bit, frequencies.get(bit) + 1);
        }
    }

    // Calcular la entropia usando la formula de Shannon
    let entropy = 0;
    let probs = [];
    
    // Calcular probabilidades en orden especifico (primero 0, luego 1)
    const probability0 = frequencies.get(0) / totalBits;
    const probability1 = frequencies.get(1) / totalBits;
    
    // Agregar probabilidades al array en orden específico
    probs.push(probability0);
    probs.push(probability1);
    
    // Calcular entropia
    entropy -= probability0 * Math.log2(probability0);
    entropy -= probability1 * Math.log2(probability1);

    return { entropy, probs };
}

function createParityMatrices(data, N) {
    const matrices = [];
    const totalBits = data.length * 8;
    const matrixSize = N * N;
    const totalMatrices = Math.ceil(totalBits / matrixSize);
    console.log(`  totalBits: ${totalBits} matrixSize: ${matrixSize} totalMatrices: ${totalMatrices}`);
    
    let bitIndex = 0;
    
    for (let m = 0; m < totalMatrices; m++) {
        // Crear matriz (N+1)x(N+1) inicializada con ceros
        const matrix = Array(N + 1).fill().map(() => Array(N + 1).fill(0));
        
        // Llenar la matriz NxN con los bits de datos
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (bitIndex < totalBits) {
                    // Calcular el indice del byte y la posicion del bit
                    const byteIndex = Math.floor(bitIndex / 8);
                    const bit = (data[byteIndex] & (1 << (7 - (bitIndex % 8)))) !== 0 ? 1 : 0;
                    matrix[i][j] = bit;
                }
                bitIndex++;
            }
        }

        // Calcular bits de paridad de filas (ultima columna)
        for (let i = 0; i < N; i++) {
            matrix[i][N] = matrix[i].slice(0, N).reduce((acc, bit) => acc ^ bit, 0);
        }

        // Calcular bits de paridad de columnas (ultima fila)
        for (let j = 0; j < N; j++) {
            matrix[N][j] = matrix.slice(0, N).reduce((acc, row) => acc ^ row[j], 0);
        }

        // Calcular bit de paridad total (esquina inferior derecha)
        matrix[N][N] = matrix[N].slice(0, N).reduce((acc, bit) => acc ^ bit, 0);

        matrices.push(matrix);
    }

    return matrices;
}

function loadReceivedMatrices(data, N) {
    const matrices = [];
    const bitsPerMatrix = (N + 1) ** 2; // N+1 filas con N+1 bits cada una
    const totalBits = data.length * 8;
    let totalMatrices = Math.floor(totalBits / bitsPerMatrix);
    totalMatrices += (totalMatrices === 0);
    console.log(`totalBits:${totalBits}  bitsPerMatrix: ${bitsPerMatrix} totalMatrices: ${totalMatrices}`);
    
    let bitIndex = 0;
    
    for (let m = 0; m < totalMatrices; m++) {
        // Crear matriz (N+1)x(N+1)
        const matrix = Array(N + 1).fill().map(() => Array(N + 1).fill(0));
        
        // Leer N+1 filas, cada una con N+1 bits
        for (let i = 0; i <= N; i++) {
            for (let j = 0; j <= N; j++) {
                if (bitIndex < totalBits) {
                    // Calcular el indice del byte y la posición del bit
                    const byteIndex = Math.floor(bitIndex / 8);
                    const bit = (data[byteIndex] & (1 << (7 - (bitIndex % 8)))) !== 0 ? 1 : 0;
                    matrix[i][j] = bit;
                }
                bitIndex++;
            }
        }
        matrices.push(matrix);
    }

    return matrices;
}

function calculateChannelInputProbabilities(matrices) {
    let zeros = 0;
    let ones = 0;
    let totalBits = 0;

    for (const matrix of matrices) {
        for (let i = 0; i <= matrix.length - 1; i++) {
            for (let j = 0; j <= matrix.length - 1; j++) {
                if (matrix[i][j] === 0) zeros++;
                else ones++;
                totalBits++;
            }
        }
    }
    return [zeros / totalBits, ones / totalBits];
}

function calculateEntropy(probabilities) {
    return -probabilities.reduce((acc, p) => 
        p > 0 ? acc + p * Math.log2(p) : acc, 0);
}

function estimateChannelMatrix(sentMatrices, receivedMatrices) {
    const transitions = {
        '0->0': 0,
        '0->1': 0,
        '1->0': 0,
        '1->1': 0
    };

    let totalBitsZero = 0;
    let totalBitsOne = 0;

    const minMatrices = Math.min(sentMatrices.length, receivedMatrices.length);
    for (let m = 0; m < minMatrices; m++) {
        const N = sentMatrices[m].length ;
        // Analizar toda la matriz, incluyendo bits de paridad
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const sentBit = sentMatrices[m][i][j];
                const receivedBit = receivedMatrices[m][i][j];
                
                const key = `${sentBit}->${receivedBit}`;
                transitions[key]++;
                
                if (sentBit === 0) totalBitsZero++;
                else totalBitsOne++;
            }
        }
    }
    
    return [
        [transitions['0->0'] / totalBitsZero, transitions['0->1'] / totalBitsZero],
        [transitions['1->0'] / totalBitsOne, transitions['1->1'] / totalBitsOne]
    ];
}

function analyzeReceivedMessages(sentMatrices, receivedMatrices, N) {
    let correct = 0;
    let errors = 0;
    let corregible = 0;

    for (let m = 0; m < Math.min(sentMatrices.length, receivedMatrices.length); m++) {
        const result = compareMatrices(sentMatrices[m], receivedMatrices[m], N);
        
        if (result.errorCount === 0) {
            correct++;
        } else if (result.errorCount === 1) {
            corregible++;
        } else {
            errors++;
        }
    }
    return {
        correct,
        errors,
        corregible,
        totalMatrices: Math.min(sentMatrices.length, receivedMatrices.length)
    };
}

function compareMatrices(sentMatrix, receivedMatrix, N) {
    let errorCount = 0;
    
    for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
            if (sentMatrix[i][j] !== receivedMatrix[i][j]) {
                errorCount++;
            }
        }
    }

    return {
        errorCount
    };
}

function calculateChannelMetrics(channelMatrix, inputProbs, prioriEntropy) {
    // Calcular p(b=0) y p(b=1)
    const p_b = calculateOutputProbabilities(channelMatrix,inputProbs);

    // Calcular p(a|b) usando Bayes
    const p_a_given_b = calculateConditionalProbabilities(channelMatrix, inputProbs, p_b);

    // Calcular H(A|b=0) y H(A|b=1)
    const posterioriEntropies = calculatePosterioriEntropies(p_a_given_b);

    // Calcular equivocacion H(A|B)
    const equivocation = calculateEquivocation(inputProbs, channelMatrix);

    // Calcular informacion mutua
    const mutualInformation = prioriEntropy - equivocation;

    return {
        prioriEntropy,
        posterioriEntropies,
        equivocation,
        mutualInformation
    };
}

function calculatePosterioriEntropies(p_a_given_b) {
    const posterioriEntropies = [];

    // Iterar sobre las columnas (valores de b_j)
    for (let j = 0; j < p_a_given_b[0].length; j++) {
        const probs = [];
        // Construir una lista con las probabilidades P(A | B = b_j) para cada A
        for (let i = 0; i < p_a_given_b.length; i++) {
            probs.push(p_a_given_b[i][j]);
        }
        // Calcular la entropía de las probabilidades obtenidas
        const entropy = calculateEntropy(probs);
        posterioriEntropies.push(entropy);
    }

    return posterioriEntropies;
}

function calculateEquivocation(inputProbs, channelMatrix) {
    let equivocation = 0;

    // Iterar sobre cada fila de la matriz (valores de A)
    for (let i = 0; i < channelMatrix.length; i++) {
        // Calcular la entropía de la fila (P(B | A = a_i))
        const rowEntropy = calculateEntropy(channelMatrix[i]);
        // Ponderar por la probabilidad de entrada P(A = a_i)
        equivocation += inputProbs[i] * rowEntropy;
    }
    return equivocation;
}

function calculateOutputProbabilities(channelMatrix, inputProbs) {
    // Obtener el número de columnas (símbolos de salida)
    const numOutputSymbols = channelMatrix[0].length;
    
    // Array para almacenar las probabilidades de salida
    const outputProbabilities = new Array(numOutputSymbols).fill(0);
    
    // Para cada símbolo de salida (columna)
    for (let outputIndex = 0; outputIndex < numOutputSymbols; outputIndex++) {
        let probability = 0;
        
        // Para cada símbolo de entrada (fila)
        for (let inputIndex = 0; inputIndex < channelMatrix.length; inputIndex++) {
            // P(b) = Suma de P(b|a) * P(a)
            const transitionProbability = channelMatrix[inputIndex][outputIndex];  // P(b|a)
            const inputProbability = inputProbs[inputIndex];                       // P(a)
            
            probability += transitionProbability * inputProbability;
        }
        outputProbabilities[outputIndex] = probability;
    }
    return outputProbabilities;
}

function calculateConditionalProbabilities(channelMatrix, inputProbs, outputProbs) {
    const numInputSymbols = channelMatrix.length;
    const numOutputSymbols = channelMatrix[0].length;
    
    // Crear matriz para almacenar P(a|b)
    const conditionalProbabilities = Array(numInputSymbols).fill().map(() => Array(numOutputSymbols).fill(0));
    
    // Para cada símbolo de entrada (a)
    for (let inputIndex = 0; inputIndex < numInputSymbols; inputIndex++) {
        // Para cada símbolo de salida (b)
        for (let outputIndex = 0; outputIndex < numOutputSymbols; outputIndex++) {
            // Aplicar el Teorema de Bayes:
            // P(a|b) = P(b|a) * P(a) / P(b)
            const p_b_given_a = channelMatrix[inputIndex][outputIndex];  // P(b|a)
            const p_a = inputProbs[inputIndex];                          // P(a)
            const p_b = outputProbs[outputIndex];                        // P(b)
            conditionalProbabilities[inputIndex][outputIndex] = 
                (p_b_given_a * p_a) / p_b;
        }
    }  
    return conditionalProbabilities;
}

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
    console.log(`- Entropía a posteriori:`);
    console.log(`  H(A/b=0) = ${metrics.posterioriEntropies[0].toFixed(4)} bits`);
    console.log(`  H(A/b=1) = ${metrics.posterioriEntropies[1].toFixed(4)} bits`);
    console.log(`- Equivocación H(A/B): ${metrics.equivocation.toFixed(4)} bits`);
    console.log(`- Información mutua: ${metrics.mutualInformation.toFixed(4)} bits`);
}

main();