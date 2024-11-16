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

    // Estimar matriz de probabilidades del canal
    const channelMatrix = estimateChannelMatrix(sentMatrices, receivedMatrices);
    console.log('\nc. Matriz de probabilidades del canal:');
    printChannelMatrix(channelMatrix);

    // Analizar mensajes
    const messageAnalysis = analyzeReceivedMessages(receivedMatrices, N);
    printMessageAnalysis(messageAnalysis);

    // Calcular métricas
    const metrics = calculateChannelMetrics(channelMatrix, sentEntropyAndProbs);
    printMetrics(metrics);
    //console.log(sentEntropyAndProbs);
}

/*
Cargar las matrices de sentFile y receivedFile
*/
//Matrices del mensaje enviado
function createParityMatrices(data, N) {


    let binaryString = '';

    // Convertir cada byte a su representación binaria y concatenarlo a la cadena
    for (let byte of data) {
        // Usar `toString(2)` para convertir a binario, y luego rellenar con ceros a la izquierda si es necesario
        binaryString += byte.toString(2).padStart(8, '0');
    }
    //console.log("data binaria ", binaryString);


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
        // Recorrer la matriz y asignar los bits
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (bitIndex < totalBits) {
                    // Calcular el índice del byte
                    const byteIndex = Math.floor(bitIndex / 8);

                    // Obtener el bit en la posición 'bitIndex' sin desplazamientos complejos
                    const bit = (data[byteIndex] & (1 << (7 - (bitIndex % 8)))) !== 0 ? 1 : 0;

                    // Asignar el bit a la matriz
                    matrix[i][j] = bit;
                }
                bitIndex++;
            }
        }

        // Calcular bits de paridad de filas (última columna)
        for (let i = 0; i < N; i++) {
            let rowParity = matrix[i][0];
            for (let j = 1; j < N; j++) {
                rowParity ^= matrix[i][j];  //XOR
            }
            matrix[i][N] = rowParity;
        }

        // Calcular bits de paridad de columnas (última fila)
        for (let j = 0; j < N; j++) {
            let colParity = matrix[0][j];
            for (let i = 1; i < N; i++) {
                colParity ^= matrix[i][j];
            }
            matrix[N][j] = colParity;
        }

        // Calcular bit de paridad total (esquina inferior derecha: A.K.A: ultimo elemento)
        let totalParity = matrix[0][N];
        // XOR de los bits de paridad de filas
        for (let i = 1; i < N; i++) {
            totalParity ^= matrix[i][N];
        }
        matrix[N][N] = totalParity;
        /*console.log("Matriz N x N con XOR ultima esquina:");
        for (let row of matrix) {
            console.log(row.join(' ')); // Imprimir cada fila separada por espacios
        }*/
        matrices.push(matrix);
    }

    return matrices;
}
//Matrices de archivo recibido
function loadReceivedMatrices(data, N) {
    let binaryString = '';

    // Convertir cada byte a su representación binaria y concatenarlo a la cadena
    for (let byte of data) {
        // Usar `toString(2)` para convertir a binario, y luego rellenar con ceros a la izquierda si es necesario
        binaryString += byte.toString(2).padStart(8, '0');
    }
    //console.log("data binaria ", binaryString);



    const matrices = [];
    const bitsPerMatrix = (N + 1) ** 2; // N+1 filas con N+1 bits cada una
    const totalBits = data.length * 8;
    var totalMatrices = Math.floor(totalBits / bitsPerMatrix);
    totalMatrices += (totalMatrices === 0);
    console.log(`totalBits:${totalBits}  bitsPerMatrix: ${bitsPerMatrix} totalMatrices: ${totalMatrices}`);
    let bitIndex = 0;
    for (let m = 0; m < totalMatrices; m++) {
        // Crear matriz (N+1)x(N+1)
        const matrix = Array(N + 1).fill().map(() => Array(N + 1).fill(0));
        // Leer N+1 filas, cada una con N+1 bits (N bits de datos + 1 bit de paridad, ultima fila = bits de paridad)
        for (let i = 0; i <= N; i++) {
            for (let j = 0; j <= N; j++) {
                if (bitIndex < totalBits) {
                    // Calcular el índice del byte
                    const byteIndex = Math.floor(bitIndex / 8);

                    // Obtener el bit en la posición 'bitIndex' sin desplazamientos complejos
                    const bit = (data[byteIndex] & (1 << (7 - (bitIndex % 8)))) !== 0 ? 1 : 0;

                    // Asignar el bit a la matriz
                    matrix[i][j] = bit;
                }
                bitIndex++;
            }

        }

        /*console.log("Matriz N x N recreada:");
        for (let row of matrix) {
            console.log(row.join(' ')); // Imprimir cada fila separada por espacios
        }*/
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

    let totalBitsDown = 0;
    let totalBitsUp = 0;
    //console.log(sentMatrices);
    //console.log(receivedMatrices);
    // Comparar solo los bits de datos (no los de paridad)
    const minMatrices = Math.min(sentMatrices.length, receivedMatrices.length);
    for (let m = 0; m < minMatrices; m++) {
        const N = sentMatrices[m].length - 1; // Tamaño real de la matriz de datos

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const sentBit = sentMatrices[m][i][j];
                const receivedBit = receivedMatrices[m][i][j];
                //console.log('recived:' + receivedBit + ' sent:' + sentBit);
                const key = `${sentBit}->${receivedBit}`;
                transitions[key]++;
                if (key == '0->0' || key == '0->1') {
                    totalBitsUp++;
                }
                else {
                    totalBitsDown++;
                }
            }
        }
    }

    console.log(transitions);
    // Calcular probabilidades
    const channelMatrix = [
        [transitions['0->0'] / totalBitsUp, transitions['0->1'] / totalBitsUp],
        [transitions['1->0'] / totalBitsDown, transitions['1->1'] / totalBitsDown]
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
    let corregible = 0;

    for (let m = 0; m < matrices.length; m++) {
        const matrix = matrices[m];
        const result = checkMatrixParity(matrix, N);

        if (result.isCorrect) {
            correct++;
        }
        else if (result.isCorrectible) {
            corregible++;
            //errors++;
        }
        else {
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

    let differencesRowCount = [0, 0];

    // Verificar paridad de filas
    for (let i = 0; i <= N; i++) {

        let rowSum = matrix[i][0];
        // XOR de todos los bits de la fila incluyendo el bit de paridad
        for (let j = 1; j <= N; j++) {
            rowSum += matrix[i][j];
        }
        differencesRowCount[rowSum % 2]++;
        if (differencesRowCount[0] > 1 && differencesRowCount[1] > 1) {//esto deberia cambiar 
            //error irreparable
            return {
                isCorrect: false,
                isCorrectible: false,
            }
        }
    }
    let differencesColCount = [0, 0];
    // Verificar paridad de columnas
    for (let j = 0; j <= N; j++) {

        let colSum = matrix[0][j];
        // XOR de todos los bits de la columna incluyendo el bit de paridad
        for (let i = 1; i <= N; i++) {
            colSum += matrix[i][j];
        }
        differencesColCount[colSum % 2]++;
        if (differencesColCount[0] > 1 && differencesColCount[1] > 1) {
            return {
                isCorrect: false,
                isCorrectible: false,
            }
        }
    }

    if ( (differencesRowCount[0] == 1 ||differencesRowCount[1] == 1) && (differencesColCount[0] == 1 ||differencesColCount[1] == 1)  ) {
        return {
            isCorrect: false,
            isCorrectible: true,
        };
    }
    if ( (differencesRowCount[0] == 0 ||differencesRowCount[1] == 0) && (differencesColCount[0] == 0 ||differencesColCount[1] == 0)  ) {
        return {
            isCorrect: true,
            isCorrectible: false,
        };
    }
    // Si hay multiples errores
    return {
        isCorrect: false,
        isCorrectible: false,
    }
}


/*
 Calculos
 */

// Funcion para calcular la entropia de una fuente binaria
function calculateEntropyAndProbabilities(data) {
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
    let probs = [];
    for (let [_, freq] of frequencies) {
        const probability = freq / totalBits;
        probs.push(probability);
        entropy -= probability * Math.log2(probability);
    }
    console.log(probs);
    return { entropy, probs };
}


function calculateChannelMetrics(channelMatrix, sentEntropyAndProbs) {
    // Calcular p(b=0) y p(b=1) con la suma del producto de p(a_j) y p(b_j | a_j)
    sentEntropyAndProbs.probs.reverse();//en otro lado mejol
    const p_b = channelMatrix[0].map((_, j) => channelMatrix.reduce((acc, fila, i) => acc + fila[j] * sentEntropyAndProbs.probs[i], 0));


    const sum_bj = channelMatrix[0].map((_, j) => channelMatrix.reduce((acc, fila) => acc + fila[j], 0));
    // Calcular p(a|b=0) y p(a|b=1) usando las probabilidades condicionales
    const p_ai_bj2 = channelMatrix.map((fila, i) =>
        fila.map((p_bj_given_ai, j) => {
            return sum_bj[j] !== 0 ? p_bj_given_ai / sum_bj[j] : 0;
        })
    );


    const Pai_bj = channelMatrix.map((fila, i) =>
        fila.map((p_bj_given_ai, j) => {
            return p_bj_given_ai * sentEntropyAndProbs.probs[i];
        })
    );
    const p_ai_bj = Pai_bj.map((fila, i) =>
        fila.map((p_bj_given_ai, j) => {
            //console.log(p_bj_given_ai +  " / " +  p_b[j]);
            return (p_b[j] != 0) ? p_bj_given_ai / p_b[j] : 0;
        })
    );
    //console.log(p_b);
    //console.log(p_ai_bj2);
    //console.log(p_ai_bj);


    //console.log(p_ai_bj);
    // Calcular entropía H(A|b=0) y H(A|b=1) usando las columnas de p_aj_bj
    function entropia(probabilidades) {
        return probabilidades.reduce((acc, p) => p > 0 ? acc + p * Math.log2(1 / p) : acc, 0);
    }

    const posterioriEntropies = [];
    // Calcular H(A|b=0) y H(A|b=1) utilizando las columnas de p_aj_bj
    posterioriEntropies[0] = entropia(p_ai_bj.map(row => row[0]));
    posterioriEntropies[1] = entropia(p_ai_bj.map(row => row[1]));
    // Calcular la equivocación (entropía condicional promedio)
    const prioriEntropy = sentEntropyAndProbs.entropy;
    const equivocation = p_b[0] * posterioriEntropies[0] + p_b[1] * posterioriEntropies[1];
    const mutualInformation = prioriEntropy - equivocation;
    //ruido o equivocacion H(A/B)
    //perdida H(B/A)
    // Calcular entropía H(B|a=0) y H(B|a=1) usando las columnas de p_bj_aj
    posterioriEntropies[3] = entropia(channelMatrix[0]);
    posterioriEntropies[4] = entropia(channelMatrix[1]);
    const perdida = p_b[0] * posterioriEntropies[3] + p_b[1] * posterioriEntropies[4];
    return {
        prioriEntropy,
        posterioriEntropies,
        equivocation,
        mutualInformation,
        perdida
    };
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
    console.log(`- Entropía a posteriori: \n\tH(A/b=0) = ${metrics.posterioriEntropies[0]} bits, \n\tH(A/b=1) = ${metrics.posterioriEntropies[1]} bits, \n\tH(B/a=0) = ${metrics.posterioriEntropies[3]} bits, \n\tH(B/a=1) = ${metrics.posterioriEntropies[4]} bits`);
    console.log(`- Equivocación/ruido H(A/B): ${metrics.equivocation.toFixed(4)} bits`);
    console.log(`- Información mutua: ${metrics.mutualInformation.toFixed(4)} bits`);
    console.log(`- Perdida H(B/A): ${metrics.perdida.toFixed(4)} bits`);
}

// Ejecutar el programa
main();