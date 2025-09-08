// Pure pairing logic extracted for testing and optional reuse.
// Exposes a global `Pairing` object in browsers and CommonJS export in Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Pairing = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function shuffleArray(array, rng) {
    const rand = rng || Math.random;
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function greedyPairGroup(group, opts) {
    const rng = opts && opts.rng;
    let byeCandidate = null;
    let working = group.slice();
    if (working.length > 1 && working.length % 2 !== 0) {
      let sortedGroup = working.slice().sort((a, b) => a.wins - b.wins);
      byeCandidate = sortedGroup[sortedGroup.length - 1];
      working = working.filter(c => c.name !== byeCandidate.name);
    }

    function buildPairsFromOrder(arr) {
      let remaining = arr.slice();
      let resultPairs = [];
      let conflicts = 0;
      while (remaining.length > 1) {
        const a = remaining.shift();
        let idx = remaining.findIndex(c => c.team !== a.team);
        if (idx === -1) { idx = 0; conflicts += 1; }
        const b = remaining.splice(idx, 1)[0];
        resultPairs.push({ comp1: a.name, comp2: b.name });
      }
      if (remaining.length === 1) {
        resultPairs.push({ comp1: remaining[0].name, comp2: "BYE" });
      }
      return { resultPairs, conflicts };
    }

    const tries = Math.min(100, 10 + working.length * 5);
    let best = null;
    for (let t = 0; t < tries; t++) {
      let trial = working.slice();
      shuffleArray(trial, rng);
      const { resultPairs, conflicts } = buildPairsFromOrder(trial);
      if (!best || conflicts < best.conflicts) {
        best = { pairs: resultPairs, conflicts };
        if (best.conflicts === 0) break;
      }
    }

    let pairs = best ? best.pairs.slice() : [];

    // Light local improvement via pair swaps to reduce same-team conflicts.
    const teamMap = {};
    group.forEach(c => { teamMap[c.name] = c.team || ""; });

    function conflictScore(p) {
      if (p.comp2 === "BYE") return 0;
      const t1 = teamMap[p.comp1];
      const t2 = teamMap[p.comp2];
      if (!t1 || !t2) return 0;
      return t1 === t2 ? 1 : 0;
    }

    function tryImprovement(ps) {
      for (let i = 0; i < ps.length; i++) {
        if (ps[i].comp2 === "BYE") continue;
        for (let j = i + 1; j < ps.length; j++) {
          if (ps[j].comp2 === "BYE") continue;
          const a1 = ps[i].comp1, a2 = ps[i].comp2;
          const b1 = ps[j].comp1, b2 = ps[j].comp2;
          const before = conflictScore(ps[i]) + conflictScore(ps[j]);

          const opt1_i = { comp1: a1, comp2: b1 };
          const opt1_j = { comp1: a2, comp2: b2 };
          const after1 = conflictScore(opt1_i) + conflictScore(opt1_j);
          if (after1 < before) {
            ps[i].comp2 = b1;
            ps[j].comp1 = a2;
            return true;
          }

          const opt2_i = { comp1: a1, comp2: b2 };
          const opt2_j = { comp1: b1, comp2: a2 };
          const after2 = conflictScore(opt2_i) + conflictScore(opt2_j);
          if (after2 < before) {
            ps[i].comp2 = b2;
            ps[j].comp2 = a2;
            return true;
          }
        }
      }
      return false;
    }

    let improvIterations = Math.min(10, Math.max(0, pairs.length * 2));
    while (improvIterations-- > 0) {
      if (!tryImprovement(pairs)) break;
    }

    if (byeCandidate) {
      pairs.push({ comp1: byeCandidate.name, comp2: "BYE" });
    }
    return pairs;
  }

  function pairCompetitors(competitors, eliminationThreshold, opts) {
    const rng = opts && opts.rng;
    let validCompetitors = competitors.filter(c => c.losses < eliminationThreshold);
    if (validCompetitors.every(c => c.wins === 0 && c.losses === 0)) {
      shuffleArray(validCompetitors, rng);
    }
    validCompetitors.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

    if (validCompetitors.length === 2) {
      return [{ comp1: validCompetitors[0].name, comp2: validCompetitors[1].name }];
    }

    let groups = {};
    validCompetitors.forEach(comp => {
      if (!groups[comp.losses]) groups[comp.losses] = [];
      groups[comp.losses].push(comp);
    });

    if (eliminationThreshold > 2 && groups[0] && groups[0].length === 1) {
      const lone = groups[0].shift();
      groups[1] = groups[1] || [];
      groups[1].push(lone);
    }

    let pairs = [];
    Object.keys(groups).sort((a, b) => a - b).forEach(loss => {
      let group = groups[loss];
      let groupPairs = greedyPairGroup(group, { rng });
      pairs = pairs.concat(groupPairs);
    });
    return pairs;
  }

  return {
    shuffleArray,
    greedyPairGroup,
    pairCompetitors
  };
});

