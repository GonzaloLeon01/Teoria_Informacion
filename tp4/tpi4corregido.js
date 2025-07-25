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
    console.log(sentEntropyAndProbs);
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
    const messageAnalysis = analyzeReceivedMessages(receivedMatrices, N);
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
    const matrixSize = (N + 1) ** 2;
    const totalMatrices = Math.ceil(totalBits / matrixSize);
    console.log(`totalBits: ${totalBits+N*N} matrixSize: ${matrixSize} totalMatrices: ${totalMatrices}`);
    
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
                    // Calcular el indice del byte y la posicion del bit
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
        const N = sentMatrices[m].length;
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

function analyzeReceivedMessages(receivedMatrices, N) {
    let correct = 0;
    let errors = 0;
    let corregible = 0;

    for (let m = 0; m < receivedMatrices.length; m++) {
        const result = analyzeParityBits(receivedMatrices[m], N);

        if (result.errors === 0) {
            correct++;
        } else if (result.errors === 1) {
            corregible++;
        } else {
            errors++;
        }
    }

    return {
        correct,
        errors,
        corregible,
        totalMatrices: receivedMatrices.length
    };
}

function analyzeParityBits(receivedMatrix, N) {
    let rowErrors = 0;
    let colErrors = 0;
    let errorRow = -1;
    let errorCol = -1;

    for (let i = 0; i < N; i++) {
        let rowParity = 0;
        for (let j = 0; j <= N; j++) {
            rowParity ^= receivedMatrix[i][j];
        }
        if (rowParity !== 0) {
            rowErrors++;
            errorRow = i;
        }
    }

    for (let j = 0; j < N; j++) {
        let colParity = 0;
        for (let i = 0; i <= N; i++) {
            colParity ^= receivedMatrix[i][j];
        }
        if (colParity !== 0) {
            colErrors++;
            errorCol = j;
        }
    }

    if (rowErrors === 1 && colErrors === 1) {
        return { errors: 1, position: { row: errorRow, col: errorCol } };
    }
    else if (rowErrors === 0 && colErrors === 0) {
        return { errors: 0 };
    }
    else {
        return { errors: 2 };
    }
}

function calculateChannelMetrics(channelMatrix, inputProbs, prioriEntropy) {
    // Calcular p(b=0) y p(b=1)
    const p_b = calculateOutputProbabilities(channelMatrix, inputProbs);

    // Calcular p(a|b) usando Bayes
    const p_a_given_b = calculateConditionalProbabilities(channelMatrix, inputProbs, p_b);

    // Calcular H(A|b=0) y H(A|b=1)
    const posterioriEntropies = calculatePosterioriEntropies(p_a_given_b);

    // Calcular equivocacion H(A|B)
    const equivocation = calculateEquivocation(p_b, posterioriEntropies);

    // Calcular perdida H(B|A)
    const loss = calculateLoss(inputProbs, channelMatrix);

    // Calcular informacion mutua
    const mutualInformation = prioriEntropy - equivocation;

    return {
        prioriEntropy,
        posterioriEntropies,
        equivocation,
        loss,           
        mutualInformation
    };
}


function calculateOutputProbabilities(channelMatrix, inputProbs) {
    // Obtener el numero de columnas (simbolos de salida)
    const numOutputSymbols = channelMatrix[0].length;
    
    // Array para almacenar las probabilidades de salida
    const outputProbabilities = new Array(numOutputSymbols).fill(0);
    
    // Para cada simbolo de salida (columna)
    for (let outputIndex = 0; outputIndex < numOutputSymbols; outputIndex++) {
        let probability = 0;
        
        // Para cada simbolo de entrada (fila)
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
            // Verificar división por cero
            if (outputProbs[outputIndex] === 0) {
                console.warn(`Warning: Zero probability in output symbol ${outputIndex}`);
                conditionalProbabilities[inputIndex][outputIndex] = 0;
                continue;
            }
            
            const p_b_given_a = channelMatrix[inputIndex][outputIndex];  // P(b|a)
            const p_a = inputProbs[inputIndex];                          // P(a)
            const p_b = outputProbs[outputIndex];                        // P(b)
            
            const result = (p_b_given_a * p_a) / p_b;
    
            // Verificar que el resultado sea un numero válido
            if (isNaN(result) || !isFinite(result)) {
                console.error('Invalid probability calculated:', result);
                conditionalProbabilities[inputIndex][outputIndex] = 0;
            } else {
                conditionalProbabilities[inputIndex][outputIndex] = result;
            }
        }
    }
    
    return conditionalProbabilities;
}

function calculatePosterioriEntropies(p_a_given_b) {
    const posterioriEntropies = [];

    // Iterar sobre las columnas (valores de b_j)
    for (let j = 0; j < p_a_given_b[0].length; j++) {
        const probs = [];
        // Construir una lista con las probabilidades P(A | B = b_j) para cada A
        for (let i = 0; i < p_a_given_b.length; i++) {
            probs.push(p_a_given_b[i][j]);          //pone un un vector las probabilidades y despues le calcula a cada una la entropia y la suma
        }
        // Calcular la entropia de las probabilidades obtenidas
        const entropy = calculateEntropy(probs);
        posterioriEntropies.push(entropy);
    }
    return posterioriEntropies;
}

function calculateEquivocation(p_b, posterioriEntropies) {
    let equivocation = 0;
    
    // H(A|B) = ∑ P(b)*H(A|b)
    for (let j = 0; j < p_b.length; j++) {
        equivocation += p_b[j] * posterioriEntropies[j];
    }
    
    return equivocation;
}

// funcion para calcular la perdida H(B|A)
function calculateLoss(inputProbs, channelMatrix) {
    let loss = 0;
    
    // Para cada simbolo de entrada a
    for (let inputIndex = 0; inputIndex < inputProbs.length; inputIndex++) {
        // Obtener la probabilidad del simbolo de entrada P(a)
        const inputProbability = inputProbs[inputIndex];
        
        // Obtener la fila de probabilidades condicionales P(B|a)
        const conditionalProbabilities = channelMatrix[inputIndex];
        
        // Calcular H(B|a) para este simbolo de entrada
        const entropyGivenInput = calculateEntropy(conditionalProbabilities);
        
        // Sumar P(a) * H(B|a) a la perdida total
        loss += inputProbability * entropyGivenInput;
    }
    
    return loss;
}

function printChannelMatrix(matrix) {
    console.log('P(y|x):\n');
    console.log('     y=0      y=1');
    console.log(`x=0  ${matrix[0][0].toFixed(4)}  ${matrix[0][1].toFixed(4)}`);
    console.log(`x=1  ${matrix[1][0].toFixed(4)}  ${matrix[1][1].toFixed(4)}\n`);
}

function printMessageAnalysis(analysis) {
    console.log('\nd - Análisis de mensajes:');
    console.log(`Total de Mensajes enviados: ${analysis.totalMatrices}`);
    console.log(`- Mensajes enviados correctamente: ${analysis.correct}`);
    console.log(`- Mensajes enviados con errores no corregibles: ${analysis.errors}`);
    console.log(`- Mensajes enviados con errores corregibles: ${analysis.corregible}`);
}

function printMetrics(metrics) {
    console.log('\ne. Métricas del canal:');
    console.log(`- Entropía a priori: ${metrics.prioriEntropy.toFixed(4)} bits`);
    console.log(`- Entropía a posteriori:`);
    console.log(`  H(A/b=0) = ${metrics.posterioriEntropies[0].toFixed(4)} bits`);
    console.log(`  H(A/b=1) = ${metrics.posterioriEntropies[1].toFixed(4)} bits`);
    console.log(`- Equivocación H(A/B): ${metrics.equivocation.toFixed(4)} bits`);
    console.log(`- Pérdida H(B/A): ${metrics.loss.toFixed(4)} bits`);
    console.log(`- Información mutua: ${metrics.mutualInformation.toFixed(4)} bits`);
}

main();