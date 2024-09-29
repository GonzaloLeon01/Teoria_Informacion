const fs = require("fs");

function readInputFile(filename) {
  try {
    const data = fs.readFileSync(filename, "ascii");
    return data.trim().split(/\s+/);
  } catch (err) {
    console.error(`Error reading input file: ${err.message}`);
    process.exit(1);
  }
}

function getAlphabet(words) {
  return [...new Set(words.join(""))].sort();
}

function checkKraftMcMillan(words, alphabetSize) {
  const lengths = words.map((word) => word.length);
  console.log(lengths);
  const sum = lengths.reduce(
    (acc, len) => acc + Math.pow(alphabetSize, -len),
    0
  ); //Suma en el vector cada elemento haciendo   1/(alphabetSize**(len)) len es el elemento
  console.log("Suma de Kraft-McMillan:", sum);
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

function calculateProbabilities(words, alphabetSize) {
  return words.map((word) => Math.pow(1 / alphabetSize, word.length));
}

function calculateEntropy(probabilities, alphabetSize) {
  const base = Math.log(alphabetSize);
  return -probabilities.reduce((acc, p) => acc + (p * Math.log(p)) / base, 0); //calculo de entropia revisado
}

function calculateAverageLength(words, probabilities) {
  return words.reduce(
    (acc, word, i) => acc + word.length * probabilities[i],
    0
  );
}

function generateRandomMessage(words, probabilities, N) {
  let message = "";
  for (let i = 0; i < N; i++) {
    const rand = Math.random();
    let cumProb = 0;
    for (let j = 0; j < words.length; j++) {
      cumProb += probabilities[j];
      if (rand < cumProb) {
        message += words[j] + " ";
        break;
      }
    }
  }
  return message.trim();
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 3) {
    console.error("Usage: node tpi2.js input.txt [output.txt N]");
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];
  const N = args[2] ? parseInt(args[2]) : null;

  const words = readInputFile(inputFile);
  const alphabet = getAlphabet(words);
  const alphabetSize = alphabet.length;

  console.log("Alfabeto:", alphabet.join(""));
  console.log("Tamaño del alfabeto:", alphabetSize);
  const kraftMcMillanSatisfied = checkKraftMcMillan(words, alphabetSize);
  console.log(
    "Desigualdad de Kraft-McMillan satisfecha:",
    kraftMcMillanSatisfied
  );

  const instantaneous = isInstantaneous(words);
  console.log("Es código instantáneo:", instantaneous);

  if (kraftMcMillanSatisfied && instantaneous) {
    const probabilities = calculateProbabilities(words, alphabetSize);

    if (probabilities.reduce((acc, p) => acc + p, 0) >= 1) {
      console.log("Es compacto ya que la suma de las probabilidades es 1");
      console.log("Probabilidades para código compacto:", probabilities);
      const entropy = calculateEntropy(probabilities, alphabetSize);
      console.log("Entropía:", entropy);

      const averageLength = calculateAverageLength(words, probabilities);
      console.log("Longitud promedio del código:", averageLength);

      if (N !== null && outputFile) {
        const message = generateRandomMessage(words, probabilities, N);
        fs.writeFileSync(outputFile, message, "ascii");
        console.log(
          `Mensaje aleatorio de ${N} símbolos escrito en ${outputFile}`
        );
      }
    }
  } else {
    console.log("The code is not compact.");
  }
}

main();
