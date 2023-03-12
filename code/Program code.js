/**
 * Linguistic terms definition.
 */
const DM = {
  VImp: [0.85, 0.1],
  Imp: [0.75, 0.2],
  MedImp: [0.6, 0.3],
  Med: [0.45, 0.45],
  MedLow: [0.4, 0.55],
  Low: [0.3, 0.65],
  VLow: [0.2, 0.7],
};

const CR = {
  VImp: [0.9, 0.05],
  Imp: [0.8, 0.15],
  MedImp: [0.65, 0.25],
  Fair: [0.5, 0.4],
  MedFair: [0.4, 0.5],
  Poor: [0.25, 0.65],
  VPoor: [0.15, 0.8],
};

const ALT = {
  VGood: [1, 0, 0],
  Good: [0.9, 0.05, 0.05],
  MGood: [0.65, 0.25, 0.1],
  Med: [0.5, 0.5, 0],
  MLow: [0.4, 0.6, 0],
  Low: [0.25, 0.7, 0.05],
  VLow: [0.05, 0.9, 0.05],
};

/**
 * Define matrices
 */
const ImportanceOfAlternativesBasedOnDM = [
  [[ALT.Med, ALT.MGood, ALT.Good, ALT.Med], [ALT.MLow, ALT.Low, ALT.Low, ALT.Med], [ALT.Low, ALT.Low, ALT.Med, ALT.MGood], [ALT.VGood, ALT.Good, ALT.MGood, ALT.Good], [ALT.Low, ALT.Good, ALT.Med, ALT.MLow]],
  [[ALT.VLow, ALT.MLow, ALT.Low, ALT.Med], [ALT.Low, ALT.MLow, ALT.Low, ALT.Good], [ALT.VGood, ALT.Good, ALT.VGood, ALT.Med], [ALT.MGood, ALT.MGood, ALT.Good, ALT.Med], [ALT.Good, ALT.Med, ALT.Good, ALT.MLow]],
  [[ALT.Good, ALT.Med, ALT.MGood, ALT.Good], [ALT.Good, ALT.Med, ALT.VGood, ALT.Good], [ALT.MLow, ALT.MGood, ALT.Med, ALT.MLow], [ALT.VLow, ALT.VLow, ALT.MLow, ALT.VLow], [ALT.Low, ALT.MLow, ALT.Med, ALT.Low]],
  [[ALT.Med, ALT.Med, ALT.MGood, ALT.VGood], [ALT.MGood, ALT.Good, ALT.VGood, ALT.Low], [ALT.Low, ALT.VLow, ALT.Med, ALT.Med], [ALT.Low, ALT.MLow, ALT.Med, ALT.MGood], [ALT.Good, ALT.VGood, ALT.MGood, ALT.MLow]],
];

const ImportanceAndWeightsDM = [DM.Imp, DM.VImp, DM.MedImp, DM.Med];

const ImportanceWeightOfCriterion = [
  [CR.MedFair, CR.VImp, CR.Poor, CR.Fair],
  [CR.Fair, CR.Imp, CR.Poor, CR.Poor],
  [CR.MedImp, CR.MedImp, CR.VPoor, CR.MedFair],
  [CR.Imp, CR.MedImp, CR.MedFair, CR.VPoor],
  [CR.Imp, CR.VImp, CR.MedFair, CR.Poor],
];

/**
 * Define helper functions
 */
function getDMWeight(ifns) {
  const denominator = ifns.reduce((res, ifn) => {
    return res += ifn[0] + (1 - ifn[0] - ifn[1]) * (ifn[0] / (ifn[0] + ifn[1]));
  }, 0);
  
  return ifns.map((ifn) => {
    return (ifn[0] + (1 - ifn[0] - ifn[1]) * (ifn[0] / (ifn[0] + ifn[1]))) / denominator;
  });
}

const lambdas = getDMWeight(ImportanceAndWeightsDM);
console.log('Lambdas: ', lambdas);

function getIFWA(lambda) {
  return (crWeights) => {
    const mu = 1 - crWeights.reduce((mult, crWeight, index) => {
      return mult * Math.pow((1 - crWeight[0]), lambda[index]);
    }, 1);
    const nu = crWeights.reduce((mult, crWeight, index) => {
      return mult * Math.pow(crWeight[1], lambda[index]);
    }, 1);
    return [
      mu,
      nu,
      1 - mu - nu,
    ];
  }
}

const CR_WEIGHTS = ImportanceWeightOfCriterion.map(getIFWA(lambdas));
console.log('Weight of cri: ', CR_WEIGHTS);

const R_MATRIX = ImportanceOfAlternativesBasedOnDM.map((row) => {
  return row.map(getIFWA(lambdas));
});

console.log('R matrix: ', R_MATRIX);

function getAggregatedWeightedMatrix(RMatrix, crWeights) {
  return RMatrix.map((row) => {
    return row.map((item, j) => {
      const mu = item[0] * crWeights[j][0];
      const nu = item[1] + crWeights[j][1] - item[1] * crWeights[j][1];
      return [mu, nu, 1 - mu - nu];
    });
  });
}

const AGG_WEIGHTED_MATRIX = getAggregatedWeightedMatrix(R_MATRIX, CR_WEIGHTS);
console.log('Aggregated weighted matrix: ', AGG_WEIGHTED_MATRIX);

/**
 * @param matrix
 * @param rules [1, 1, 1, -1, 1] - the rule of taking: max or min
 */
const getPositiveAndNegativeIdealSolutions = (matrix, rules) => {
  if (matrix[0].length !== rules.length) {
    throw new Error('not equal number of criteries and rules');
  }
  const positive = [];
  const negative = [];
  for (let j = 0; j < matrix[0].length; j += 1) {
    const muRule = rules[j] === 1
      ? (arr) => Math.max.apply(Math, arr)
      : (arr) => Math.min.apply(Math, arr);
    const nuRule = rules[j] === 1
      ? (arr) => Math.min.apply(Math, arr)
      : (arr) => Math.max.apply(Math, arr);
    const muValues = []
    const nuValues = []
    for (let i = 0; i < matrix.length; i += 1) {
      muValues.push(matrix[i][j][0]);
      nuValues.push(matrix[i][j][1]);
    }
    const muPositive = muRule(muValues);
    const nuPositive = nuRule(nuValues);
    positive[j] = [muPositive, nuPositive, 1 - muPositive - nuPositive];
    const muNegative = nuRule(muValues);
    const nuNegative = muRule(nuValues);
    negative[j] = [muNegative, nuNegative, 1 - muNegative - nuNegative];
  }
  
  return {
    positive,
    negative,
  }
};

const IDEAL_SOLUTIONS = getPositiveAndNegativeIdealSolutions(AGG_WEIGHTED_MATRIX, [1, -1, 1, -1, 1]);
console.log('Ideal solutions: ', IDEAL_SOLUTIONS);

const getSeparationMeasures = (aggWeightedMatrix, positive, negative) => {
  const SPLUS = [];
  const SMINUS = [];
  aggWeightedMatrix.map((row, i) => {
    const sPlusSum = row.reduce((res, value, j) => {
      return res += Math.pow((value[0] - positive[j][0]), 2) + Math.pow((value[1] - positive[j][1]), 2) + Math.pow((value[2] - positive[j][2]), 2);
    }, 0);
    const sMinusSum = row.reduce((res, value, j) => {
      return res += Math.pow((value[0] - negative[j][0]), 2) + Math.pow((value[1] - negative[j][1]), 2) + Math.pow((value[2] - negative[j][2]), 2);
    }, 0);
    const sPlus = Math.pow((1/(2 * aggWeightedMatrix[0].length)) * sPlusSum, 0.5);
    const sMinus = Math.pow((1/(2 * aggWeightedMatrix[0].length)) * sMinusSum, 0.5);
    SPLUS.push(sPlus);
    SMINUS.push(sMinus);
    return [sPlus, sMinus];
  });
  return { SPLUS, SMINUS };
};

const SEPARATION_MEASURES = getSeparationMeasures(AGG_WEIGHTED_MATRIX, IDEAL_SOLUTIONS.positive, IDEAL_SOLUTIONS.negative);
console.log('Separation measures: ', SEPARATION_MEASURES);

const relativeClosenessCof = (Splus, Sminus) => {
  return Splus.map((_, i) => {
    return Sminus[i] / (Sminus[i] + Splus[i]);
  });
};

const standardSolution = relativeClosenessCof(SEPARATION_MEASURES.SPLUS, SEPARATION_MEASURES.SMINUS);
console.log('Relative Closeness Cof: ', standardSolution);

const getClosenessCof = (DPlus, DMinus, sigmaP, sigmaM) => {
  const sumDP = DPlus.reduce(sum);
  const sumDM = DMinus.reduce(sum);
  return DPlus.map((_, i) => {
    return sigmaP * (DMinus[i] / sumDM) - sigmaM * (DPlus[i] / sumDP);
  });
};

const getClosenessCofV2 = (DPlus, DMinus, sigmaP, sigmaM) => {
  return DPlus.map((_, i) => {
    return (sigmaP * DMinus[i]) / (sigmaM * DPlus[i] + sigmaP * DMinus[i]);
  });
};

const getClosenessCofV3 = (DPlus, DMinus, sigmaP, sigmaM) => {
  return DPlus.map((_, i) => {
    return (sigmaP * DMinus[i]) + (sigmaM * DPlus[i]);
  });
};

const getClosenessCofV4 = (DPlus, DMinus, sigma) => {
  return DPlus.map((_, i) => {
    return DMinus[i] - sigma * DPlus[i];
  });
};

const getClosenessCofV5 = (DPlus, DMinus, sigmaP, sigmaM) => {
  return DPlus.map((_, i) => {
    return (sigmaP * DMinus[i]) - (sigmaM * DPlus[i]);
  });
};

const getSolutionOrder = (arr) => {
  const orderedArr = arr.slice().sort((a, b) => (a > b ? -1 : 1));
  const order = [];
  orderedArr.forEach((value) => {
    const index = arr.findIndex((v) => v === value);
    order.push(index + 1);
  });

  return order;
};

const compareArrays = (arr1, arr2) => {
  return JSON.stringify(arr1) == JSON.stringify(arr2);
};

const sum = (accumulator, currentValue) => accumulator + currentValue;

const standardOrder = getSolutionOrder(standardSolution);
console.log('------- standard solution order -------');
console.log(standardOrder);


const DPlus = SEPARATION_MEASURES.SPLUS;
const DMinus = SEPARATION_MEASURES.SMINUS;

console.log('------- relative with different coeff -------');
const sigmas = [
  [1, 0],
  [0.99, 0.01],
  [0.9, 0.1],
  [0.8, 0.2],
  [0.7, 0.3],
  [0.6, 0.4],
  [0.5, 0.5],
  [0.4, 0.6],
  [0.3, 0.7],
  [0.2, 0.8],
  [0.1, 0.9],
  [0.01, 0.99],
  [0, 1],
];
console.log('========= V1 w+(D-/SUM(D-)) - w-(D+/SUM(D+)) =======');
for (let i = 0; i < sigmas.length; i += 1) {
  console.log(`\n\nCC: ${sigmas[i]}`, getClosenessCof(DPlus, DMinus, sigmas[i][0], sigmas[i][1]));
  const solution = getClosenessCof(DPlus, DMinus, sigmas[i][0], sigmas[i][1]);
  if (!compareArrays(standardOrder, getSolutionOrder(solution))) {
    console.log('V1 DIFFERENT RESULTS:', {
      sigmas: sigmas[i],
    });
    console.log('solution: ', solution);
    console.log('solution order: ', getSolutionOrder(solution));
  }
}
console.log('========= V2 w+D-/(w-D+ + w+D-) =======');
for (let i = 0; i < sigmas.length; i += 1) {
  const solution = getClosenessCofV2(DPlus, DMinus, sigmas[i][0], sigmas[i][1])
  console.log(`\n\nCC: ${sigmas[i]}`, solution);
  if (!compareArrays(standardOrder, getSolutionOrder(solution))) {
    console.log('V2 DIFFERENT RESULTS:', {
      sigmas: sigmas[i],
    });
    console.log('solution: ', solution);
    console.log('solution order: ', getSolutionOrder(solution));
  }
}
console.log('========= V3 (w+ * D-[i]) + (w+ * D+[i]) =======');
console.log('------- standard solution order -------');
console.log(standardOrder);

for (let i = 0; i < sigmas.length; i += 1) {
  const solution = getClosenessCofV3(DPlus, DMinus, sigmas[i][0], sigmas[i][1]);
  console.log(`\n\nCC: ${sigmas[i]}`, solution);
  console.log('solution order: ', getSolutionOrder(solution));
  if (!compareArrays(standardOrder, getSolutionOrder(solution))) {
    console.log('V3 DIFFERENT RESULTS:', {
      sigmas: sigmas[i],
    });
  }
}

console.log('========= V5 (w+ * D-[i]) - (w+ * D+[i]) =======');
console.log('------- standard solution order -------');
console.log(standardOrder);

for (let i = 0; i < sigmas.length; i += 1) {
  const solution = getClosenessCofV5(DPlus, DMinus, sigmas[i][0], sigmas[i][1]);
  console.log(`\n\nCC: ${sigmas[i]}`, solution);
  console.log('solution order: ', getSolutionOrder(solution));
  if (!compareArrays(standardOrder, getSolutionOrder(solution))) {
    console.log('V5 DIFFERENT RESULTS:', {
      sigmas: sigmas[i],
    });
  }
}

const lambdasV2 = [
  0.5,
  1,
  2,
  3,
  4,
];
console.log('========= V4 D-[i] - L * D+[i] =======');
console.log('------- standard solution order -------');
console.log(standardOrder);

for (let i = 0; i < lambdasV2.length; i += 1) {
  const solution = getClosenessCofV4(DPlus, DMinus, lambdasV2[i]);
  console.log(`\n\nCC: ${lambdasV2[i]}`, solution);
  console.log('solution order: ', getSolutionOrder(solution));
}