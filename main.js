// Alex Doner
// Feb 18 2025
// This now uses the 'greedySort' method. 
//   Works for many many competitors and does a good job preventing teammate matchups. 
// This is the new *variable* elimination method.


document.addEventListener("DOMContentLoaded", () => {
  // UI element references
  const nameInput              = document.getElementById("name");
  const teamInput              = document.getElementById("team");
  const addButton              = document.getElementById("addCompetitor");
  const removeButton           = document.getElementById("removeCompetitor");
  const sampleButton           = document.getElementById("sampleTeams");
  const eraseButton            = document.getElementById("eraseCompetitors");
  const resetButton            = document.getElementById("resetScores");
  const saveRosterButton       = document.getElementById("saveRoster");
  const loadRosterButton       = document.getElementById("loadRoster"); // New button
  const loadRosterInput        = document.getElementById("loadRosterInput"); // Hidden file input
  const beginCompetitionButton = document.getElementById("beginCompetition");
  const finalizeRoundButton    = document.getElementById("finalizeRound");
  const tiebreakThirdFourthBtn = document.getElementById("tiebreakThirdFourth");
  const calcTeamPointsButton   = document.getElementById("calcTeamPoints");
  const teamPointsDisplay      = document.getElementById("teamPointsDisplay");
  const statusBar              = document.getElementById("statusBar");
  const adminModeButton        = document.getElementById("adminMode"); // New Admin Mode button
  const toggleHowToBtn         = document.getElementById("toggleHowTo");
  const toggleExtraInfoBtn     = document.getElementById("toggleExtraInfo");
  
  const competitorsTableBody   = document.querySelector("#competitorsTable tbody");
  const filterActiveOnly       = document.getElementById("filterActiveOnly");
  const filterTeamSelect       = document.getElementById("filterTeam");
  const resultsDiv             = document.getElementById("results");

  const eliminationThresholdInput = document.getElementById("eliminationThreshold");
  let eliminationThreshold = parseInt(eliminationThresholdInput.value, 10) || 2;

  eliminationThresholdInput.addEventListener("change",() => {
	let value = parseInt(eliminationThresholdInput.value, 10);
	if (isNaN(value) || value < 1) {
		value = 1;
	}
	if (value > 10) {
		value = 10;
	}
	eliminationThreshold = value;
	eliminationThresholdInput.value = value;
	// Optionally, recalc pairings if a round is in progress.
	if (competitionStarted) {
		displayPairings();
	}
    updateStatusBar();
  });

  // In-memory competitor data.
  let competitors = [];
  if (localStorage.getItem("competitors")) {
    competitors = JSON.parse(localStorage.getItem("competitors"));
  }
  
  let currentPairings = [];
  let competitionStarted = false;
	if (localStorage.getItem("competitionStarted") == "true") {
		competitionStarted = true;
	}
  let roundNumber = parseInt(localStorage.getItem("roundNumber") || "0", 10);
  let competitionFinished = (localStorage.getItem("competitionFinished") || "false") === "true";
  let adminMode = false; // New flag
  let tiebreakerMode = false;

  // Save the competitors array to localStorage.
  function saveCompetitors() {
    localStorage.setItem("competitors", JSON.stringify(competitors));
  }

  // Update the competitors table.
  // When adminMode is true, the name, team, wins, and losses cells become editable.
  function updateCompetitorsTable() {
    // Sort competitors with special handling for explicit placements (lower is better).
    // Only prioritize explicit place after the event is finished or during tiebreaker.
    const usePlace = competitionFinished || tiebreakerMode;
    competitors.sort((a, b) => {
      const ap = (a.place !== undefined && a.place !== null) ? a.place : null;
      const bp = (b.place !== undefined && b.place !== null) ? b.place : null;
      if (usePlace && (ap !== null || bp !== null)) {
        if (ap === null) return 1;
        if (bp === null) return -1;
        if (ap !== bp) return ap - bp;
      }
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.wins - a.wins;
    });

    competitorsTableBody.innerHTML = "";
    // Build absolute rank map from the full, sorted list
    const rankMap = new Map();
    competitors.forEach((c, idx) => {
      rankMap.set(c.name, idx + 1);
    });
    const showActiveOnly = !adminMode && filterActiveOnly && filterActiveOnly.checked;
    const teamFilter = !adminMode && filterTeamSelect ? (filterTeamSelect.value || "") : "";
    const rowsToRender = competitors.filter(c => {
      if (showActiveOnly && !(c.losses < eliminationThreshold)) return false;
      if (teamFilter && c.team !== teamFilter) return false;
      return true;
    });
    rowsToRender.forEach((comp, index) => {
      const row = document.createElement("tr");

      // Index cell.
      const indexCell = document.createElement("td");
      indexCell.innerText = rankMap.get(comp.name) || (index + 1);
      row.appendChild(indexCell);

      // Name cell.
      const nameCell = document.createElement("td");
      nameCell.innerText = comp.name;
      nameCell.contentEditable = adminMode ? "true" : "false";
      row.appendChild(nameCell);

      // Team cell.
      const teamCell = document.createElement("td");
      teamCell.innerText = comp.team;
      teamCell.contentEditable = adminMode ? "true" : "false";
      row.appendChild(teamCell);

      // Wins cell.
      const winsCell = document.createElement("td");
      winsCell.innerText = comp.wins;
      winsCell.contentEditable = adminMode ? "true" : "false";
      row.appendChild(winsCell);

      // Losses cell.
      const lossesCell = document.createElement("td");
      lossesCell.innerText = comp.losses;
      lossesCell.contentEditable = adminMode ? "true" : "false";
      row.appendChild(lossesCell);

      competitorsTableBody.appendChild(row);
    });
    
    // Button state management.
    sampleButton.disabled = competitors.length > 0;
    eraseButton.disabled = competitors.length === 0;
    const activeCount = competitors.filter(c => c.losses < eliminationThreshold).length;
    if (competitors.length === 0 || competitionFinished || activeCount <= 1) {
      beginCompetitionButton.disabled = true;
      if (competitors.length === 0) competitionStarted = false;
    } else {
      beginCompetitionButton.disabled = competitionStarted;
    }
    finalizeRoundButton.disabled = !competitionStarted;
    saveCompetitors();
    populateTeamFilterOptions();
    updateStatusBar();
    updateTiebreakerButtonState();
  }

  // Read the editable roster table and update the competitor array.
  function updateCompetitorsFromTable() {
    let rows = competitorsTableBody.querySelectorAll("tr");
    let newCompetitors = [];
    rows.forEach(row => {
      let cells = row.querySelectorAll("td");
      if (cells.length >= 5) {
        newCompetitors.push({
          name: cells[1].innerText.trim(),
          team: cells[2].innerText.trim(),
          wins: parseInt(cells[3].innerText.trim(), 10) || 0,
          losses: parseInt(cells[4].innerText.trim(), 10) || 0
        });
      }
    });
    competitors = newCompetitors;
    saveCompetitors();
  }

  // Add a competitor.
  function addCompetitor(name, team) {
    if (!name) return alert("Name is required");
    if (competitors.some(c => c.name === name)) return alert("Competitor already exists");
    competitors.push({ name, team, wins: 0, losses: 0 });
    updateCompetitorsTable();
  }

  // Remove a competitor.
  function removeCompetitor(name) {
    if (!name) return alert("Enter a name to remove");
    const index = competitors.findIndex(c => c.name === name);
    if (index === -1) return alert("Competitor not found");
    competitors.splice(index, 1);
    updateCompetitorsTable();
  }

  // Sample teams function.
  function addSampleTeams() {
    let sampleCompetitors = [];
    let team_num = 3;
    let comp_num = 5;
    for (let team = 1; team <= team_num; team++) {
      for (let i = 1; i <= comp_num; i++) {
        let competitorNumber = ((team - 1) * comp_num) + i;
        sampleCompetitors.push({
          name: `Competitor ${competitorNumber} (${team})`,
          team: `Team ${team}`,
          wins: 0,
          losses: 0
        });
      }
    }
    /* Uncomment for competitors without a team.
    for (let i = 1; i <= comp_num; i++) {
      sampleCompetitors.push({
        name: `Competitor ${(team_num * comp_num) + i}`,
        team: "",
        wins: 0,
        losses: 0
      });
    } */
    competitors = competitors.concat(sampleCompetitors);
    updateCompetitorsTable();
  }

  // Erase all competitors.
  function eraseAllCompetitors() {
    if (confirm("Are you sure you want to erase all competitors?")) {
      competitors = [];
      updateCompetitorsTable();
      resultsDiv.innerHTML = "";
      teamPointsDisplay.innerHTML = "";
      competitionStarted = false;
      localStorage.setItem("competitionStarted", "false");
      competitionFinished = false;
      localStorage.setItem("competitionFinished", "false");
      beginCompetitionButton.disabled = true;
      finalizeRoundButton.disabled = true;
			clearPairings();
      roundNumber = 0;
      localStorage.setItem("roundNumber", String(roundNumber));
      updateStatusBar();
      updateTiebreakerButtonState();
    }
  }

  // Reset scores (and clear pairings).
  function resetScores() {
    if (confirm("Are you sure you want to erase all scores?")) {
        competitors.forEach(c => {
          c.wins = 0;
          c.losses = 0;
          if ('place' in c) delete c.place;
        });
        updateCompetitorsTable();
        teamPointsDisplay.innerHTML = "";
        resultsDiv.innerHTML = "";
        competitionStarted = false;
				localStorage.setItem("competitionStarted", "false");
        competitionFinished = false;
        localStorage.setItem("competitionFinished", "false");
        roundNumber = 0;
        localStorage.setItem("roundNumber", String(roundNumber));
        beginCompetitionButton.disabled = competitors.length === 0;
        finalizeRoundButton.disabled = true;
				clearPairings();
        updateStatusBar();
        updateTiebreakerButtonState();
    }
  }

  // Save roster to CSV.
  function saveRoster() {
    if (competitors.length === 0) {
      alert("No competitors to save.");
      return;
    }
    let csvContent = "Name,Team,Wins,Losses\n";
    competitors.forEach(comp => {
      csvContent += `"${comp.name}","${comp.team}",${comp.wins},${comp.losses}\n`;
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const fileName = `roster_${new Date().toISOString().split("T")[0]}.csv`;
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Download not supported in this browser.");
    }
  }

  // Basic CSV line parser that respects quoted commas and escaped quotes.
  function parseCsvLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  // Load roster from CSV.
  function loadRoster(event) {
    const input = event.target;
    const file = input.files[0];
    if (!file) {
      input.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const contents = e.target.result;
      const lines = contents.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        alert("Invalid CSV file.");
        input.value = "";
        return;
      }
      const newCompetitors = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const fields = parseCsvLine(line);
        if (fields.length < 4) continue;
        const [name, team, wins, losses] = fields;
        newCompetitors.push({
          name: name,
          team: team,
          wins: parseInt(wins, 10) || 0,
          losses: parseInt(losses, 10) || 0
        });
      }
      competitors = newCompetitors;
      updateCompetitorsTable();
      input.value = "";
    };
    reader.onerror = function() {
      alert("Error reading file.");
      input.value = "";
    };
    reader.readAsText(file);
  }

  // Helper: Fisher–Yates shuffle.
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Pairing within a group with simple randomized minimization of same-team matches.
  function greedyPairGroup(group) {
    // Choose BYE as the highest-wins competitor when group size is odd (>1)
    let byeCandidate = null;
    let working = group.slice();
    if (working.length > 1 && working.length % 2 !== 0) {
      let sortedGroup = working.slice().sort((a, b) => a.wins - b.wins);
      byeCandidate = sortedGroup[sortedGroup.length - 1];
      working = working.filter(c => c.name !== byeCandidate.name);
    }

    // Helper to build pairs from an ordered list, counting team conflicts
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

    // Try multiple shuffles to minimize same-team pairings.
    const tries = Math.min(100, 10 + working.length * 5);
    let best = null;
    for (let t = 0; t < tries; t++) {
      let trial = working.slice();
      shuffleArray(trial);
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

          // Option 1: swap a2 <-> b1
          const opt1_i = { comp1: a1, comp2: b1 };
          const opt1_j = { comp1: a2, comp2: b2 };
          const after1 = conflictScore(opt1_i) + conflictScore(opt1_j);

          if (after1 < before) {
            ps[i].comp2 = b1;
            ps[j].comp1 = a2;
            return true;
          }

          // Option 2: swap a2 <-> b2
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

  // Require that all non-BYE matches have a selected winner
  function hasAllSelections() {
    if (!Array.isArray(currentPairings) || currentPairings.length === 0) return false;
    return currentPairings.every(p => p.comp2 === "BYE" || (p.selected && p.selected !== ""));
  }

  function updateFinalizeEnabled() {
    finalizeRoundButton.disabled = (!competitionStarted) || (!hasAllSelections());
  }

  // pairCompetitors: filters eligible competitors, shuffles if first round,
  // groups them by loss count, and pairs within each group using a greedy algorithm.
  function pairCompetitors() {
    let validCompetitors = competitors.filter(c => c.losses < eliminationThreshold);
    if (validCompetitors.every(c => c.wins === 0 && c.losses === 0)) {
      shuffleArray(validCompetitors);
    }
    validCompetitors.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

	//TESTING here as well
	if (validCompetitors.length === 2) {
      return [{
        comp1: validCompetitors[0].name,
        comp2: validCompetitors[1].name
      }];
    }

    let groups = {};
    validCompetitors.forEach(comp => {
      if (!groups[comp.losses]) groups[comp.losses] = [];
      groups[comp.losses].push(comp);
    });

	// TESTING HERE
	if (eliminationThreshold > 2 && groups[0] && groups[0].length === 1) {
      const lone = groups[0].shift();
      groups[1] = groups[1] || [];
      groups[1].push(lone);
    }

    let zeroLoss = groups[0] || [];
    let oneLoss = groups[1] || [];
    let pairs = [];
    Object.keys(groups).sort((a, b) => a - b).forEach(loss => {
      let group = groups[loss];
      let groupPairs = greedyPairGroup(group);
      pairs = pairs.concat(groupPairs);
    });
    return pairs;
  }

  // Display pairings in three columns:
  // Left: pairing text; Center: select dropdown (which locks on selection);
  // Right: Unlock button.
	/*
  function displayPairings() {
    resultsDiv.innerHTML = "";
    currentPairings = pairCompetitors();
    shuffleArray(currentPairings);
    currentPairings.forEach((pair, index) => {
      const pairingDiv = document.createElement("div");
      pairingDiv.className = "pairing";
      pairingDiv.dataset.index = index;
      
      // Left column: pairing text.
      const pairingText = document.createElement("div");
      pairingText.className = "pairing-text";
      pairingText.innerText = `${pair.comp1} vs ${pair.comp2}`;
      pairingDiv.appendChild(pairingText);
      
      // Center column: select dropdown.
      const selectContainer = document.createElement("div");
      selectContainer.className = "pairing-select";
      let select;
      if (pair.comp2 !== "BYE") {
        select = document.createElement("select");
        select.dataset.index = index;
        const defaultOption = document.createElement("option");
        defaultOption.text = "Select Winner";
        defaultOption.value = "";
        select.appendChild(defaultOption);
        [pair.comp1, pair.comp2].forEach(name => {
          const option = document.createElement("option");
          option.text = name;
          option.value = name;
          select.appendChild(option);
        });
        select.addEventListener("change", function() {
          if (this.value !== "") {
            this.disabled = true;
            unlockButton.disabled = false;
          }
        });
        selectContainer.appendChild(select);
      } else {
        selectContainer.innerText = "(BYE)";
      }
      pairingDiv.appendChild(selectContainer);
      
      // Right column: Unlock button.
      const unlockButton = document.createElement("button");
      unlockButton.className = "unlock-button";
      unlockButton.innerText = "Reset";
      if (pair.comp2 !== "BYE") {
        unlockButton.disabled = true;
      } else {
        unlockButton.style.display = "none";
      }
      unlockButton.addEventListener("click", function() {
        const select = pairingDiv.querySelector("select");
        if (select) {
          select.disabled = false;
          // Reset the selection.
          select.value = "";
          unlockButton.disabled = true;
        }
      });
      pairingDiv.appendChild(unlockButton);
      
      resultsDiv.appendChild(pairingDiv);
    });
  } */

		function displayPairings() {
			// Do not generate pairings unless competition has started
			if (!competitionStarted) {
				resultsDiv.innerHTML = "";
				return;
			}
			resultsDiv.innerHTML = "";
			console.log("Displaying pairings:", currentPairings);
			if (!tiebreakerMode) {
				// If a saved pairing state exists, load it; otherwise compute new pairings.
				if (!loadPairings()) {
					currentPairings = pairCompetitors();
					savePairings();
				}
			}
			console.log("Displaying pairings:", currentPairings);
			
			// Optionally, shuffle the order (if desired)
			//shuffleArray(currentPairings);
			
			currentPairings.forEach((pair, index) => {
				const pairingDiv = document.createElement("div");
				pairingDiv.className = "pairing";
				pairingDiv.dataset.index = index;
				
				// Left column: pairing text with badges and records.
				const pairingText = document.createElement("div");
				pairingText.className = "pairing-text";
				const a = getCompetitorByName(pair.comp1);
				const b = pair.comp2 !== "BYE" ? getCompetitorByName(pair.comp2) : null;
				const aRecord = a ? `(${a.wins}\u2013${a.losses})` : "";
				const bRecord = b ? `(${b.wins}\u2013${b.losses})` : "";
				const aTeam = a && a.team ? a.team : "";
				const bTeam = b && b.team ? b.team : "";
				const aBadge = aTeam ? `<span class=\"team-badge\">${aTeam}</span>` : "";
				const bBadge = bTeam ? `<span class=\"team-badge\">${bTeam}</span>` : "";
				pairingText.innerHTML = `${aBadge}<strong>${pair.comp1}</strong> <span class=\"record\">${aRecord}</span>` +
				  (pair.comp2 !== "BYE" ? ` &nbsp;vs&nbsp; ${bBadge}<strong>${pair.comp2}</strong> <span class=\"record\">${bRecord}</span>` : ` &nbsp;vs&nbsp; (BYE)`);
				pairingDiv.appendChild(pairingText);
				
				// Center column: select dropdown.
				const selectContainer = document.createElement("div");
				selectContainer.className = "pairing-select";
				let select;
				if (pair.comp2 !== "BYE") {
					select = document.createElement("select");
					select.dataset.index = index;
					const defaultOption = document.createElement("option");
					defaultOption.text = "Select Winner";
					defaultOption.value = "";
					select.appendChild(defaultOption);
					[pair.comp1, pair.comp2].forEach(name => {
						const option = document.createElement("option");
						option.text = name;
						option.value = name;
						select.appendChild(option);
					});
					
					// If a selection was previously made, restore it.
					if (pair.selected && pair.selected !== "") {
						select.value = pair.selected;
						select.disabled = true;
					}
					
					// When a winner is chosen, lock the dropdown, update the pairing state, and save.
					select.addEventListener("change", function() {
          if (this.value !== "") {
            this.disabled = true;
            currentPairings[index].selected = this.value;
            // Apply immediate record update for this selection
            applySelectionForPair(index);
            unlockButton.disabled = false;
            updateFinalizeEnabled();
          }
        });
					
					selectContainer.appendChild(select);
				} else {
					selectContainer.innerText = "(BYE)";
				}
				pairingDiv.appendChild(selectContainer);
				
				// Right column: Unlock button.
				const unlockButton = document.createElement("button");
				unlockButton.className = "unlock-button";
				unlockButton.innerText = "Reset";
				if (pair.comp2 !== "BYE") {
					// Enable unlock button only if a selection is already made.
					unlockButton.disabled = !(pair.selected && pair.selected !== "");
				} else {
					unlockButton.style.display = "none";
				}
				unlockButton.addEventListener("click", function() {
        const select = pairingDiv.querySelector("select");
        if (select) {
          // Revert previously applied selection (if any)
          revertSelectionForPair(index);
          select.disabled = false;
          select.value = "";
          currentPairings[index].selected = "";
          currentPairings[index].applied = false;
          savePairings();
          unlockButton.disabled = true;
          updateFinalizeEnabled();
        }
      });
				pairingDiv.appendChild(unlockButton);
				
				resultsDiv.appendChild(pairingDiv);
			});
			// Update finalize state after rendering/restoring selections
			updateFinalizeEnabled();
		}


  // Finalize round.
  function finalizeRound() {
    // Enforce completion: all non-BYE matches must have a winner selected
    if (!hasAllSelections()) {
      alert("Please select a winner for every match before finalizing.");
      return;
    }
    // Live updates already applied on selection; for tiebreaker, capture placements
    let lastWinner = null;
    let lastLoser = null;
    for (let i = 0; i < currentPairings.length; i++) {
      const pair = currentPairings[i];
      if (!pair || pair.comp2 === "BYE" || !pair.selected) continue;
      const winner = pair.selected;
      const loser = (winner === pair.comp1) ? pair.comp2 : pair.comp1;
      if (tiebreakerMode) {
        lastWinner = winner;
        lastLoser = loser;
      }
    }

    // If this was a 2nd–3rd tiebreaker, assign explicit placements
    if (tiebreakerMode && lastWinner && lastLoser) {
      const w = competitors.find(c => c.name === lastWinner);
      const l = competitors.find(c => c.name === lastLoser);
      if (w) w.place = 2;
      if (l) l.place = 3;
    }

    updateCompetitorsTable();
    calcTeamPoints();
		clearPairings();
    // Reset in-memory pairings so stale selections can't persist
    currentPairings = [];

    // Special handling for tiebreaker mode: do not start a new round
    if (tiebreakerMode) {
      tiebreakerMode = false;
      competitionStarted = false;
      localStorage.setItem("competitionStarted", "false");
      competitionFinished = true;
      localStorage.setItem("competitionFinished", "true");
      finalizeRoundButton.disabled = true;
      resultsDiv.innerHTML = "";
      updateStatusBar();
      updateTiebreakerButtonState();
      return;
    }

    if (competitors.filter(c => c.losses < eliminationThreshold).length > 1) {
      // next round
      roundNumber = Math.max(1, roundNumber) + 1;
      localStorage.setItem("roundNumber", String(roundNumber));
      displayPairings();
      // After rendering next round, ensure finalize reflects no selections yet
      updateFinalizeEnabled();
    } else {
      alert("Competition finished!");
      competitionStarted = false;
				localStorage.setItem("competitionStarted", "false");
      competitionFinished = true;
      localStorage.setItem("competitionFinished", "true");
      // Assign champion placement (1st) to the sole remaining active competitor
      const active = competitors.filter(c => c.losses < eliminationThreshold);
      if (active.length === 1) {
        const champ = competitors.find(c => c.name === active[0].name);
        if (champ) champ.place = 1;
      }
      updateCompetitorsTable();
      finalizeRoundButton.disabled = true;
				clearPairings();
      resultsDiv.innerHTML = "";
      updateStatusBar();
      updateTiebreakerButtonState();
    }
  }

  // Calculate team points.
  function calcTeamPoints() {
    let teamTotals = {};
    competitors.forEach(comp => {
      if (comp.team && comp.team.trim() !== "") {
        if (!teamTotals[comp.team]) {
          teamTotals[comp.team] = 0;
        }
        teamTotals[comp.team] += (comp.wins - comp.losses);
      }
    });
    // Sort teams by points desc
    const sorted = Object.entries(teamTotals).sort((a,b) => b[1] - a[1]);
    let output = "<h3>Team Points (Sum of Wins-Losses)</h3><ul>";
    sorted.forEach(([team, pts]) => {
      output += `<li>${team}: ${pts} points</li>`;
    });
    output += "</ul>";
    teamPointsDisplay.innerHTML = output;
    updateStatusBar();
    updateTiebreakerButtonState();
  }

  // Apply immediate record update when a pairing winner is selected
  function applySelectionForPair(index) {
    const pair = currentPairings[index];
    if (!pair || !pair.selected || pair.selected === "" || pair.comp2 === "BYE") return;
    if (pair.applied) return; // already applied
    const winner = pair.selected;
    const loser = (winner === pair.comp1) ? pair.comp2 : pair.comp1;
    competitors.forEach(c => {
      if (c.name === winner) c.wins += 1;
      if (c.name === loser) c.losses += 1;
    });
    pair.applied = true;
    saveCompetitors();
    savePairings();
    updateCompetitorsTable();
    calcTeamPoints();
  }

  // Revert immediate record update when a pairing selection is reset
  function revertSelectionForPair(index) {
    const pair = currentPairings[index];
    if (!pair || !pair.selected || pair.selected === "" || pair.comp2 === "BYE") return;
    if (!pair.applied) return; // nothing to revert
    const winner = pair.selected;
    const loser = (winner === pair.comp1) ? pair.comp2 : pair.comp1;
    competitors.forEach(c => {
      if (c.name === winner) c.wins = Math.max(0, (c.wins || 0) - 1);
      if (c.name === loser) c.losses = Math.max(0, (c.losses || 0) - 1);
    });
    pair.applied = false;
    saveCompetitors();
    savePairings();
    updateCompetitorsTable();
    calcTeamPoints();
  }

  // NEW: Admin Mode.
  adminModeButton.addEventListener("click", () => {
    if (!adminMode) {
      if (!confirm("Entering Admin Mode will erase current pairings. Continue?")) return;
      adminMode = true;
			clearPairings();
      resultsDiv.innerHTML = "";
      // Disable all other buttons except admin mode.
      addButton.disabled = true;
      removeButton.disabled = true;
      sampleButton.disabled = true;
      saveRosterButton.disabled = true;
      loadRosterButton.disabled = true;
      calcTeamPointsButton.disabled = true;
      resetButton.disabled = true;
      eraseButton.disabled = true;
      finalizeRoundButton.disabled = true;
      // Change button text.
      adminModeButton.innerText = "Exit Admin Mode";
      updateCompetitorsTable();
    } else {
      if (!confirm("Exit Admin Mode? Your changes will be saved.")) return;
      // Update competitors from table edits.
      updateCompetitorsFromTable();
			clearPairings();
      adminMode = false;
      addButton.disabled = false;
      removeButton.disabled = false;
      sampleButton.disabled = competitors.length > 0;
      saveRosterButton.disabled = false;
      loadRosterButton.disabled = false;
      calcTeamPointsButton.disabled = false;
      resetButton.disabled = false;
      eraseButton.disabled = competitors.length === 0;
      // Keep finalizeRoundButton disabled if competition hasn't started.
      finalizeRoundButton.disabled = !competitionStarted;
      adminModeButton.innerText = "Admin Mode";
      updateCompetitorsTable();
    }
  });

  // NEW: Update competitors from the editable table.
  function updateCompetitorsFromTable() {
    let rows = competitorsTableBody.querySelectorAll("tr");
    let newCompetitors = [];
    rows.forEach(row => {
      let cells = row.querySelectorAll("td");
      if (cells.length >= 5) {
        newCompetitors.push({
          name: cells[1].innerText.trim(),
          team: cells[2].innerText.trim(),
          wins: parseInt(cells[3].innerText.trim(), 10) || 0,
          losses: parseInt(cells[4].innerText.trim(), 10) || 0
        });
      }
    });
    competitors = newCompetitors;
    saveCompetitors();
  }

  function updateDiagnostics(){
	const diagnostics = document.getElementById("diagnostics");
	if (performance && performance.memory) {
		const used = performance.memory.usedJSHeapSize;
		const total = performance.memory.totalJSHeapSize;
		const limit = performance.memory.jsHeapSizeLimit;
		diagnostics.innerHTML = `<p>Used Heap: ${used.toLocaleString()} bytes</p>
								<p>Total Heap: ${total.toLocaleString()} bytes</p>
								<p>Heap Limit: ${limit.toLocaleString()} bytes</p>`;
	} else {
		diagnostics.innerHTML = `<p>Diagnostic info not available in this browser.</p>`;
	}
  } // end diagnostic

  // How To toggle
  function applyHowToCollapsed(collapsed) {
    const box = document.getElementById('infoText');
    if (!box || !toggleHowToBtn) return;
    box.style.display = collapsed ? 'none' : '';
    toggleHowToBtn.textContent = collapsed ? 'Show' : 'Hide';
    toggleHowToBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function applyExtraCollapsed(collapsed) {
    const box = document.getElementById('extraInfoBody');
    if (!box || !toggleExtraInfoBtn) return;
    box.style.display = collapsed ? 'none' : '';
    toggleExtraInfoBtn.textContent = collapsed ? 'Show' : 'Hide';
    toggleExtraInfoBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  // Ranking and tiebreak helpers
  function getRankedCompetitors() {
    return competitors.slice().sort((a, b) => {
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.wins - a.wins;
    });
  }

  function findSecondThirdTie() {
    const ranked = getRankedCompetitors();
    if (ranked.length < 3) return null;
    const second = ranked[1];
    const third = ranked[2];
    if (!second || !third) return null;
    if (second.wins === third.wins && second.losses === third.losses) {
      return { second, third };
    }
    return null;
  }

  function updateTiebreakerButtonState() {
    if (!tiebreakThirdFourthBtn) return;
    const pair = findSecondThirdTie();
    // Only allow when the match is Finished, and 2nd/3rd are tied
    const canTiebreak = !!pair && competitionFinished && !adminMode && !tiebreakerMode;
    tiebreakThirdFourthBtn.disabled = !canTiebreak;
    if (pair) {
      tiebreakThirdFourthBtn.title = `Enable tiebreaker: ${pair.second.name} vs ${pair.third.name}`;
    } else {
      tiebreakThirdFourthBtn.title = 'Enable a 2nd–3rd tiebreaker match if needed';
    }
  }


	function getCompetitorByName(name) {
		return competitors.find(c => c.name === name);
	}

  function updateStatusBar() {
    const active = competitors.filter(c => c.losses < eliminationThreshold).length;
    const roundText = competitionFinished ? 'Finished' : (tiebreakerMode ? 'Tiebreaker: 2nd–3rd' : (competitionStarted ? `Round ${roundNumber}` : `Not started`));
    if (statusBar) {
      statusBar.innerHTML = `<strong>${roundText}</strong> · Active players: ${active}`;
    }
    if (finalizeRoundButton) {
      if (!competitionStarted) {
        finalizeRoundButton.title = "Start competition to finalize";
      } else if (!hasAllSelections()) {
        finalizeRoundButton.title = "Select a winner for every match to enable";
      } else {
        finalizeRoundButton.title = "";
      }
    }
  }

	function savePairings() {
		localStorage.setItem('currentPairings', JSON.stringify(currentPairings));
		localStorage.setItem('pairingsKey', getPairingsKey());
	}

	function loadPairings() {
		const stored = localStorage.getItem('currentPairings');
		const storedKey = localStorage.getItem('pairingsKey');
		const currentKey = getPairingsKey();
		if (!stored || !storedKey) return false;
		if (storedKey !== currentKey) return false;
		try {
			const parsed = JSON.parse(stored);
			if (!Array.isArray(parsed)) return false;
			currentPairings = parsed;
			return true;
		} catch (e) {
			return false;
		}
	}

	function clearPairings() {
		localStorage.removeItem('currentPairings');
		localStorage.removeItem('pairingsKey');
	}

  function getPairingsKey() {
    const names = competitors.map(c => c.name).sort();
    return JSON.stringify({ names, threshold: eliminationThreshold });
  }

  // Routine Update of diagnostics!
  setInterval(updateDiagnostics, 5000) 
  updateDiagnostics();

  // --- Event Listeners ---
  addButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const team = teamInput.value.trim();
    addCompetitor(name, team);
    nameInput.value = "";
    teamInput.value = "";
    updateTiebreakerButtonState();
  });

  removeButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    removeCompetitor(name);
    nameInput.value = "";
    updateTiebreakerButtonState();
  });

  sampleButton.addEventListener("click", addSampleTeams);
  eraseButton.addEventListener("click", eraseAllCompetitors);
  
  resetButton.addEventListener("click", () => {
    resetScores();
    competitionStarted = false;
    beginCompetitionButton.disabled = competitors.length === 0;
    finalizeRoundButton.disabled = true;
    updateStatusBar();
  });
  
  saveRosterButton.addEventListener("click", saveRoster);
  
  loadRosterButton.addEventListener("click", () => {
    loadRosterInput.click();
  });
  
  loadRosterInput.addEventListener("change", loadRoster);
  
  beginCompetitionButton.addEventListener("click", () => {
    if (competitors.length === 0) return;
    competitionStarted = true;
		localStorage.setItem("competitionStarted", "true")
    beginCompetitionButton.disabled = true;
    roundNumber = 1;
    localStorage.setItem("roundNumber", String(roundNumber));
    competitionFinished = false;
    localStorage.setItem("competitionFinished", "false");
    finalizeRoundButton.disabled = true;
    displayPairings();
    updateStatusBar();
    updateTiebreakerButtonState();
  });
  
  finalizeRoundButton.addEventListener("click", finalizeRound);
  
  calcTeamPointsButton.addEventListener("click", calcTeamPoints);

  // How To toggle behavior
  const howToCollapsedStored = localStorage.getItem('howToCollapsed');
  let howToCollapsed = howToCollapsedStored === 'true';
  applyHowToCollapsed(howToCollapsed);
  if (toggleHowToBtn) {
    toggleHowToBtn.addEventListener('click', () => {
      howToCollapsed = !howToCollapsed;
      localStorage.setItem('howToCollapsed', howToCollapsed ? 'true' : 'false');
      applyHowToCollapsed(howToCollapsed);
    });
  }

  // Extra Info toggle behavior
  const extraCollapsedStored = localStorage.getItem('extraCollapsed');
  let extraCollapsed = extraCollapsedStored === 'true';
  applyExtraCollapsed(extraCollapsed);
  if (toggleExtraInfoBtn) {
    toggleExtraInfoBtn.addEventListener('click', () => {
      extraCollapsed = !extraCollapsed;
      localStorage.setItem('extraCollapsed', extraCollapsed ? 'true' : 'false');
      applyExtraCollapsed(extraCollapsed);
    });
  }

  // Tiebreaker button
  if (tiebreakThirdFourthBtn) {
    tiebreakThirdFourthBtn.addEventListener('click', () => {
      const tie = findSecondThirdTie();
      if (!tie) return;
      // Set up one-off pairing
      tiebreakerMode = true;
      competitionFinished = false;
      localStorage.setItem("competitionFinished", "false");
      competitionStarted = true; // to allow displayPairings routing
      localStorage.setItem("competitionStarted", "true");
      currentPairings = [{ comp1: tie.second.name, comp2: tie.third.name }];
      clearPairings(); // ensure normal pairing cache is not used
      finalizeRoundButton.disabled = true; // require selection
      displayPairings();
      updateStatusBar();
    });
  }
  
  updateCompetitorsTable();
  displayPairings();
  updateStatusBar();
  updateTiebreakerButtonState();

  // Filters
  function populateTeamFilterOptions() {
    if (!filterTeamSelect) return;
    const prev = filterTeamSelect.value || "";
    const teams = Array.from(new Set(competitors.map(c => c.team).filter(Boolean))).sort();
    filterTeamSelect.innerHTML = '<option value="">All</option>' + teams.map(t=>`<option value="${t}">${t}</option>`).join('');
    if (teams.includes(prev)) filterTeamSelect.value = prev; else filterTeamSelect.value = "";
  }
  if (filterActiveOnly) filterActiveOnly.addEventListener('change', updateCompetitorsTable);
  if (filterTeamSelect) filterTeamSelect.addEventListener('change', updateCompetitorsTable);

});
