const fs = require('fs');

function readInputFile(filename) {
    try {
        const data = fs.readFileSync(filename, 'ascii');
        return data.trim().split(/\s+/);
    } catch (err) {
        console.error(`Error leyendo el archivo de entrada: ${err.message}`);
        process.exit(1);
    }
}

function getAlphabet(words) {
    return [...new Set(words.join(''))].sort();
}

function checkKraftMcMillan(words, alphabetSize) {
    const lengths = words.map(word => word.length);
    const sum = lengths.reduce((acc, len) => acc + Math.pow(alphabetSize, -len), 0);
    console.log('sumatoria Kraft-McMillan :', sum);
    return sum <= 1;
}
//Verifica que cada palabra no tenga prefijos
function isInstantaneous(words) {
    for (let i = 0; i < words.length; i++) {
        for (let j = 0; j < words.length; j++) {
            if (i !== j && words[j].startsWith(words[i])) {
                return false;
            }
        }
    }
    return true;
}

function calculateProbabilities(words,alphabetSize) {
    //REFACTOR
    let wordsaux = words.map(word => Math.pow(1/alphabetSize, word.length));

    console.log("suma de probabilidades: " + wordsaux.reduce((acc, p) => acc + p , 0));
    if(wordsaux.reduce((acc, p) => acc + p , 0) < 1)
        console.log("El codigo no es compacto para ninguna distribucion de probabilidades, se podrian usar longitudes mas pequeñas(no calcular la entropia ni longitud media)");
    return words.map(word => Math.pow(1/alphabetSize, word.length));
}

function calculateEntropy(probabilities,alphabetSize) {
    const base=Math.log(alphabetSize);
    return -probabilities.reduce((acc, p) => acc + p * Math.log(p)/base, 0);
}

function calculateAverageLength(words, probabilities) {
    return words.reduce((acc, word, i) => acc + word.length * probabilities[i], 0);
}

function generateRandomMessage(words, probabilities, N) {
    let message = '';
    for (let i = 0; i < N; i++) {
        const rand = Math.random();
        let cumProb = 0;
        for (let j = 0; j < words.length; j++) {
            cumProb += probabilities[j];
            if (rand < cumProb) {
                message += words[j] + ' ';
                break;//💀
            }
        }
    }
    return message.trim();
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 1 || args.length > 3) {
        console.error('Uso: node tpi2.js input.txt [output.txt N]');
        process.exit(1);
    }

    const inputFile = args[0];
    const outputFile = args[1];
    const N = args[2] ? parseInt(args[2]) : null;

    const words = readInputFile(inputFile);
    const alphabet = getAlphabet(words);
    const alphabetSize=alphabet.length;

    console.log('Alfabeto codigo:', alphabet.join(''));
    console.log('Tamaño del Alfabeto:', alphabetSize);
    const kraftMcMillanSatisfied = checkKraftMcMillan(words, alphabetSize);
    console.log('Satisface la inecuacion de Kraft-McMillan?:', kraftMcMillanSatisfied);
    
    const instantaneous = isInstantaneous(words);
    console.log('Es codigo instantaneo?:', instantaneous);
    
    if (kraftMcMillanSatisfied && instantaneous) {
        const probabilities = calculateProbabilities(words, alphabetSize);
        //funcion si es compacto
        //if(escompacto)
        console.log('Probabilidades para ser codigo compacto:', probabilities);
        

        const entropy = calculateEntropy(probabilities,alphabetSize);
        console.log('Entropia:', entropy);
        
        const averageLength = calculateAverageLength(words, probabilities);
        console.log('Longitud media del codigo:', averageLength);
        
        //este lo hace igual
        if (N!==null && outputFile) {
            const message = generateRandomMessage(words, probabilities, N);
            fs.writeFileSync(outputFile, message, 'ascii');
            console.log(`Mensaje aleatorio de ${N} simbolos escrito en ${outputFile}`);
        }
    } else {
        console.log('El codigo no es compacto.');
    }
}

main();