function calcularCondicional(p_bj_aj, sum_bj) {
    const p_aj_bj = p_bj_aj.map((fila, i) =>
        fila.map((p_bj_given_aj, j) => {
            return sum_bj[j] !== 0 ? p_bj_given_aj / sum_bj[j] : 0;
        })
    );
    return p_aj_bj;
}

function calcularProbabilidades(p_bj_aj, p_a) {
    // Calcular p(b=0) y p(b=1) con la suma del producto de p(a_j) y p(b_j | a_j)
    const p_b = p_bj_aj[0].map((_, j) => p_bj_aj.reduce((acc, fila, i) => acc + fila[j] * p_a[i], 0));

    const sum_bj = p_bj_aj[0].map((_, j) => p_bj_aj.reduce((acc, fila) => acc + fila[j], 0));
    // Calcular p(a|b=0) y p(a|b=1) usando las probabilidades condicionales
    const p_aj_bj = p_bj_aj.map((fila, i) =>
        fila.map((p_bj_given_aj, j) => {
            return sum_bj[j] !== 0 ? p_bj_given_aj / sum_bj[j] : 0;
        })
    );
    console.log(p_aj_bj);
    // Calcular entropía H(A|b=0) y H(A|b=1) usando las columnas de p_aj_bj
    function entropia(probabilidades) {
        return probabilidades.reduce((acc, p) => p > 0 ? acc + p * Math.log2(1 / p) : acc, 0);
    }
    // Calcular H(A|b=0) y H(A|b=1) utilizando las columnas de p_aj_bj
    const H_A_b0 = entropia(p_aj_bj.map(row => row[0])); // Columna 0 (b=0)
    const H_A_b1 = entropia(p_aj_bj.map(row => row[1])); // Columna 1 (b=1)

    console.log(p_aj_bj.map(row => row[0]));
    console.log(p_aj_bj.map(row => row[1]));
    // Calcular la equivocación (entropía condicional promedio)
    const equivocacion = p_b[0] * H_A_b0 + p_b[1] * H_A_b1;

    return {
        p_b0: p_b[0],
        p_b1: p_b[1],
        H_A_b0,
        H_A_b1,
        equivocacion
    };
}





// Ejemplo de uso
const p_bj_aj = [
    [0.66666666666667, 0.3333333333333333],
    [0.1, 0.9000],
];

// Suma de probabilidades p(b_j) por cada columna (reemplazo de B$38)
const sum_bj = p_bj_aj[0].map((_, j) => p_bj_aj.reduce((acc, fila) => acc + fila[j], 0));

// Probabilidades a priori de A
const p_a = [0.3750, 0.6250];



const resultado = calcularCondicional(p_bj_aj, sum_bj);
const resultado2 = calcularProbabilidades(p_bj_aj, p_a);

console.log(resultado);
console.log(resultado2);
//suma de info + probs columna probs a priori

//probs de a = cols por prob 0 b = cols2 * prob 1
//eq prob a * a priori a + prob b * a priori b