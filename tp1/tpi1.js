const fs = require('fs');
const readline = require('readline');

function calcularProbabilidadesCondicionales(texto) {
    const simbolos = [...new Set(texto)];// convierte el texto en un set (evita duplicadar caracteres) y lo pasa a array para buscar indice
    simbolos.sort();
    const n = simbolos.length;
    //Inicializa la matriz con 0
    const matriz = Array(n).fill().map(() => Array(n).fill(0));
    /*
    Creación de un mapeo de símbolos a índices:
    -reduce construye un objeto simboloAIndice donde cada símbolo se mapea a su índice correspondiente en el array simbolos.
    -acc es el acumulador, s es el símbolo y i es el índice.
    -({ ...acc, [s]: i }) expande el acumulador con la nueva entrada [s]: i, asociando cada símbolo s con su índice i. (en escencia crea un diccionario)
    */
    const simboloAIndice = simbolos.reduce((acc, s, i) => ({ ...acc, [s]: i }), {});

    //Armamos matriz de ocurrencia
    for (let i = 0; i < texto.length - 1; i++) {
        const actual = simboloAIndice[texto[i]];
        const siguiente = simboloAIndice[texto[i + 1]];
        matriz[siguiente][actual]++;
    }
    //copia la matriz en su auxiliar
    const matrizAux = matriz.map(fila => {
        return fila.map(elemento => elemento);
    });

    let matrizDecorada = decorarMatriz(matriz, simbolos);

    console.log("matriz de apariciones:\n" + matrizDecorada.map(fila => fila.map(p => p.toString().slice(0, 5)).join("\t")).join("\n"));

    //Se utiliza la "transpuesta" de la matriz y se calcula el vector de totales de cada columna
    const total = [];
    for (let i = 0; i < n; i++) {
        const sumColumna = matrizAux.reduce((sum, val) => sum + val[i], 0);
        total.push(sumColumna);
    }
    //Calcula la matriz normalizada
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            matriz[i][j] = total[j] > 0 ? matrizAux[i][j] / total[j] : 0;
        }
    }
    return { matriz, simbolos };
}
/*
Funcion esMemoriaNula:
  Parametros:
   Recibe como parametro la matriz de probabilidades de la fuente normalizada (valores mayores a cero), y una tolerancia mayor a cero
  Algoritmo:
   1.Primero calcula la diferencia de los valores de la matriz almacenandolos en un vector
   2.Luego se obtiene el maximo valor del vector
   3.Por ultimo se retorna el valor booleano comparando si la mayorDiferencia es menor a la tolerancia 
*/
function esMemoriaNula(matriz, tolerancia) {
    const diferenciasPorFila = matriz.map(fila => {
        const max = Math.max(...fila);
        const min = Math.min(...fila);
        return max - min;
    });

    const mayorDiferencia = Math.max(...diferenciasPorFila);
    console.log("\nMayor diferencia y tolerancia: " + mayorDiferencia + " y " + tolerancia);
    return mayorDiferencia < tolerancia;
}
/*
Funcion multiplicarMatrizVector
  Parametros:
   Recibe como parametros la matriz de probabilidades de la fuente normalizada (valores mayores a cero)
   y el vector estacionario (valores 0<=x<=1)
  Algoritmo:
   1. Regresa un vector producto de la multiplicacion de la matriz normalizada con el vector estacionario 
*/
function multiplicarMatrizVector(matriz, vector) {
    return matriz.map(fila =>
        fila.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
}
/*
Funcion calcularVectorEstacionario
  Parametros:
    Se reciben la matriz de probabilidades normalizada de la fuente (valores mayores a 0 y menores a 1) y
    una tolerancia que sera usada para indicar el final del calculo del Vector Estacionario (mayor a 0)
  Algoritmo:
    1. Se inicializan variables de n y el vector estacionario con valores de 1/n para cada pocision
    2. Se multiplica el vector normalizado por el vector estacionario
    3. Se calcula la diferencia entre el vector estacionario anterior y el vector actual y se guarda en el vector diferencia
    4. Se busca la maxima diferencia del vector diferencia
    5. Se compara la maxima diferencia del vector diferencia con la tolerancia, en caso de que la maxDiferencia sea mayor que
       la tolerancia se repite desde 2
    6. Se retorna el vectorActual calculado (valores entre 0 y 1) 
*/
function calcularVectorEstacionario(matriz, tolerancia) {
    const n = matriz.length;
    let vectorAnterior = Array(n).fill(1 / n);

    let vectorActual = multiplicarMatrizVector(matriz, vectorAnterior);
    let diferencia = vectorActual.map((v, i) => Math.abs(v - vectorAnterior[i]));
    let maxDiferencia = Math.max(...diferencia);

    while (maxDiferencia > tolerancia) {
        vectorActual = multiplicarMatrizVector(matriz, vectorAnterior);

        diferencia = vectorActual.map((v, i) => Math.abs(v - vectorAnterior[i]));
        maxDiferencia = Math.max(...diferencia);

        vectorAnterior = vectorActual;
    }

    return vectorActual;
}
/*
Funcion calculaEntropia
  Parametros:
    Recibe un vector de probabilidades (valores entre 0 y 1)
  Algoritmo:
    Se regresa la suma de las probabilidades multiplicadas por la informacion que produce cada simbolo/probabilidad (log2(1/prob))
*/
function calcularEntropia(probabilidades) {
    return probabilidades.reduce((sum, prob) => {
        return prob > 0 ? sum + prob * Math.log2(1 / prob) : sum;
    }, 0);
}
/*
Funcion calculoEntropiaNula
  Parametros:
    Se recibe la matriz normalizada de probabilidades de la fuente de informacion
  Algoritmo:
    1. Se calcula el promedio de los valores de cada fila y se los almacena en un vector
    2. Se llama a la funcion calcularEntropia (valor mayor a 0)
*/
function calculoEntropiaNula(matriz) {
    const promedios = matriz.map(fila => fila.reduce((sum, val) => sum + val, 0) / fila.length);
    return calcularEntropia(promedios);
}
/*
Funcion calculaCombinacionProbabilidades
  Parametros:
    Se recibe un vector de probabilidades (valores entre 0 y 1) y el orden N de la fuente que se desea calcular
  Algoritmo:
    1. Si el orden deseado es 1 entonces directamente se devuelve el vector de probabilidades
    2. Se inicializa el vector resultado y resultadoAnteriorPar (ambas con el vector de probabilidades)
    3. El proceso a continuacion se repite desde el orden 2 hasta el orden deseado
       1. Se analiza si el orden es par o impar
       2. En caso de ser par el vector resultado obtendra la combinacion de cada pocision del vector resultado
          de orden par anterior con el mismo del vector de orden par anterior
       3. En caso de ser impar el vector resultado obtendra la combinacion de cada pocision del vector del orden
          anterior con las probabilidades de la fuente
    4. Se devuelve el vector resultado con las combinaciones de probabilidades para la fuente de orden
       N (valores entre 0 y 1) y muestra por consola las combinaciones con sus probabilidades
*/
function calculaCombinacionProbabilidades(probabilidades, ordenDeseado, simbolos) {
    if (ordenDeseado === 1) {
        return probabilidades;
    }

    let resultado = probabilidades;
    let resultadoAnteriorPar = probabilidades;

    let simbolosAux = "";
    let CombinacionesDeSimbolos = [];
    let CombinacionesDeSimbolosAnteriorPar = simbolos;

    for (let ordenActual = 2; ordenActual <= ordenDeseado; ordenActual++) {

        if (ordenActual % 2 === 0) {
            // Orden par
            resultado = [];
            CombinacionesDeSimbolos = [];
            for (let i = 0; i < resultadoAnteriorPar.length; i++) {

                for (let j = 0; j < resultadoAnteriorPar.length; j++) {
                    resultado.push(resultadoAnteriorPar[i] * resultadoAnteriorPar[j]);
                    simbolosAux = CombinacionesDeSimbolosAnteriorPar[i] + " " + CombinacionesDeSimbolosAnteriorPar[j];

                    CombinacionesDeSimbolos.push(simbolosAux);
                }

            }
            resultadoAnteriorPar = resultado;
            CombinacionesDeSimbolosAnteriorPar = CombinacionesDeSimbolos;
        } else {
            // Orden impar
            const temp = [];
            const tempCombinacionesDeSimbolos = [];
            for (let i = 0; i < resultado.length; i++) {

                for (let j = 0; j < probabilidades.length; j++) {
                    temp.push(resultado[i] * probabilidades[j]);
                    simbolosAux = CombinacionesDeSimbolos[i] + " " + simbolos[j];
                    tempCombinacionesDeSimbolos.push(simbolosAux);
                }

            }

            resultado = temp;
            CombinacionesDeSimbolos = tempCombinacionesDeSimbolos;
        }
    }

    //Muestra la combinación de probabilidades
    CombinacionesDeSimbolos.forEach((elemento, indice) => {
        console.log(`${elemento} \t ${resultado[indice]}`);
    });

    return resultado;
}
/*
Funcion calculaEntropiaFuenteExtendidaN
  Parametros:
    Se reciben como parametros la matriz normalizada de probabilidades de la fuente (valores entre 0 y 1) y el orden de la fuente (mayor a 0)
  Algoritmo:
    1. Se calcula el promedio de las probabilidades
*/
function calculaEntropiaFuenteExtendidaN(matriz, N, simbolos) {
    const promedios = matriz.map(fila => fila.reduce((sum, val) => sum + val, 0) / fila.length);
    const probabilidadesExtendidas = calculaCombinacionProbabilidades(promedios, N, simbolos);

    return calcularEntropia(probabilidadesExtendidas);
}

function preguntarTolerancia(mensaje) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(mensaje, (answer) => {
            rl.close();
            resolve(parseFloat(answer));
        });
    });
}

function decorarMatriz(matriz, simbolos) {

    let matrizDecorada = matriz.map(fila => {
        return fila.map(elemento => elemento);
    });//clon de la matriz
    let simbolosClone = simbolos.slice();//clon de simbolos

    matrizDecorada.unshift(simbolosClone);//agregar fila al inicio(simbolos)

    for (let i = 0; i <= matriz.length; i++) {
        matrizDecorada[i].unshift(simbolosClone[i]);
    }//agregar columna de simbolos

    return matrizDecorada;
}
async function main() {
    const args = process.argv.slice(2);//Toma 2 argumentos
    if (args.length < 1 || args.length > 2) {
        console.log("Uso: node tpi1.js filename.txt [N]");//no hay argumentos o se paso de argumentos
        process.exit(1);
    }

    const filename = args[0];
    const N = args[1] ? parseInt(args[1]) : null;//usa el argumento opcional

    try {
        const texto = fs.readFileSync(filename, 'utf8');
        const { matriz, simbolos } = calcularProbabilidadesCondicionales(texto);


        let matrizDecorada = decorarMatriz(matriz, simbolos);

        console.log("Matriz de probabilidades condicionales:\n" + matrizDecorada.map(fila => fila.map(p => p.toString().slice(0, 4)).join("\t")).join("\n"));

        const toleranciaMemoriaNula = await preguntarTolerancia('Ingrese la tolerancia para determinar si es memoria nula: ');
        const memoriaNula = esMemoriaNula(matriz, toleranciaMemoriaNula);
        console.log("\n¿Es fuente de memoria nula?", memoriaNula);

        let entropia;
        if (memoriaNula) {
            entropia = calculoEntropiaNula(matriz);
            console.log("\nEntropía de la fuente (memoria nula):", entropia.toFixed(4));

            if (N) {
                const entropiaExtendida = calculaEntropiaFuenteExtendidaN(matriz, N, simbolos);
                console.log(`Entropía de la extensión de orden ${N}:`, entropiaExtendida.toFixed(4));
            } else {
                console.log("No se proporcionó N para calcular la entropía de la extensión.");
            }
        } else {
            const toleranciaVectorEstacionario = await preguntarTolerancia('Ingrese la tolerancia para el cálculo del vector estacionario: ');
            const vectorEstacionario = calcularVectorEstacionario(matriz, toleranciaVectorEstacionario);
            console.log("\nVector estacionario:");
            console.log(vectorEstacionario.map(p => p.toFixed(6)).join("\t"));

            entropia = calcularEntropia(vectorEstacionario);
            console.log("\nEntropía de la fuente (memoria no nula):", entropia.toFixed(4));
        }

    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

main();