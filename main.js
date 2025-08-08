// Alex Doner
// Feb 18 2025
// This now uses the 'greedySort' method. 
//   Works for many many competitors and does a good job preventing teammate matchups. 
// Adding auto email when match completes


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
  const calcTeamPointsButton   = document.getElementById("calcTeamPoints");
  const teamPointsDisplay      = document.getElementById("teamPointsDisplay");
  const adminModeButton        = document.getElementById("adminMode"); // New Admin Mode button
  
  const competitorsTableBody   = document.querySelector("#competitorsTable tbody");
  const resultsDiv             = document.getElementById("results");

  emailjs.init("sr0d0mok44haIoPb_");


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
  let adminMode = false; // New flag

  // Save the competitors array to localStorage.
  function saveCompetitors() {
    localStorage.setItem("competitors", JSON.stringify(competitors));
  }

  // Update the competitors table.
  // When adminMode is true, the name, team, wins, and losses cells become editable.
  function updateCompetitorsTable() {
    // Sort competitors: fewer losses come first; if equal, more wins appear higher.
    competitors.sort((a, b) => {
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.wins - a.wins;
    });

    competitorsTableBody.innerHTML = "";
    competitors.forEach((comp, index) => {
      const row = document.createElement("tr");

      // Index cell.
      const indexCell = document.createElement("td");
      indexCell.innerText = index + 1;
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
    if (competitors.length === 0) {
      beginCompetitionButton.disabled = true;
      competitionStarted = false;
    } else {
      beginCompetitionButton.disabled = competitionStarted;
    }
    finalizeRoundButton.disabled = !competitionStarted;
    saveCompetitors();
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
      beginCompetitionButton.disabled = true;
      finalizeRoundButton.disabled = true;
			clearPairings();
    }
  }

  // Reset scores (and clear pairings).
  function resetScores() {
    if (confirm("Are you sure you want to erase all scores?")) {
        competitors.forEach(c => {
          c.wins = 0;
          c.losses = 0;
        });
        updateCompetitorsTable();
        teamPointsDisplay.innerHTML = "";
        resultsDiv.innerHTML = "";
        competitionStarted = false;
				localStorage.setItem("competitionStarted", "false");
        beginCompetitionButton.disabled = competitors.length === 0;
        finalizeRoundButton.disabled = true;
				clearPairings();
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

  // Load roster from CSV.
  function loadRoster(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const contents = e.target.result;
      const lines = contents.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        alert("Invalid CSV file.");
        return;
      }
      const newCompetitors = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const fields = line.split(",").map(s => s.replace(/^"|"$/g, '').trim());
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
    };
    reader.onerror = function() {
      alert("Error reading file.");
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

  // Greedy pairing within a group.
  function greedyPairGroup(group) {
    let byeCandidate = null;
    if (group.length > 1 && group.length % 2 !== 0) {
      let sortedGroup = group.slice().sort((a, b) => a.wins - b.wins);
      byeCandidate = sortedGroup[sortedGroup.length - 1];
      group = group.filter(c => c.name !== byeCandidate.name);
    }
    
    let pairs = [];
    let remaining = group.slice();
    while (remaining.length > 1) {
      let competitor = remaining.shift();
      let candidateIndex = remaining.findIndex(c => c.team !== competitor.team);
      if (candidateIndex === -1) candidateIndex = 0;
      let candidate = remaining.splice(candidateIndex, 1)[0];
      pairs.push({ comp1: competitor.name, comp2: candidate.name });
    }
    if (remaining.length === 1) {
      pairs.push({ comp1: remaining[0].name, comp2: "BYE" });
    }
    if (byeCandidate) {
      pairs.push({ comp1: byeCandidate.name, comp2: "BYE" });
    }
    return pairs;
  }

  // pairCompetitors: filters eligible competitors, shuffles if first round,
  // groups them by loss count, and pairs within each group using a greedy algorithm.
  function pairCompetitors() {
    let validCompetitors = competitors.filter(c => c.losses < 2);
    if (validCompetitors.every(c => c.wins === 0 && c.losses === 0)) {
      shuffleArray(validCompetitors);
    }
    validCompetitors.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
    let groups = {};
    validCompetitors.forEach(comp => {
      if (!groups[comp.losses]) groups[comp.losses] = [];
      groups[comp.losses].push(comp);
    });
    let zeroLoss = groups[0] || [];
    let oneLoss = groups[1] || [];
    if (zeroLoss.length === 1 && oneLoss.length === 1) {
      return [{ comp1: zeroLoss[0].name, comp2: oneLoss[0].name }];
    }
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
			resultsDiv.innerHTML = "";
			console.log("Displaying pairings:", currentPairings);
			//currentPairings = pairCompetitors();
			//savePairings();
			// If a saved pairing state exists, load it; otherwise compute new pairings.
			
			if (!loadPairings()) {
				currentPairings = pairCompetitors();
				savePairings();
			} 
			console.log("Displaying pairings:", currentPairings);
			
			// Optionally, shuffle the order (if desired)
			//shuffleArray(currentPairings);
			
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
							savePairings();
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
					// Enable unlock button only if a selection is already made.
					unlockButton.disabled = !(pair.selected && pair.selected !== "");
				} else {
					unlockButton.style.display = "none";
				}
				unlockButton.addEventListener("click", function() {
					const select = pairingDiv.querySelector("select");
					if (select) {
						select.disabled = false;
						select.value = "";
						// Remove the stored selection for this pairing.
						currentPairings[index].selected = "";
						savePairings();
						unlockButton.disabled = true;
					}
				});
				pairingDiv.appendChild(unlockButton);
				
				resultsDiv.appendChild(pairingDiv);
			});
		}


  // Finalize round.
  function finalizeRound() {
    for (let i = 0; i < currentPairings.length; i++) {
      const pair = currentPairings[i];
      const pairingDiv = resultsDiv.children[i];
      if (!pairingDiv) continue;
      const select = pairingDiv.querySelector("select");
      if (!select) continue;
      const winner = select.value;
      if (!winner) continue;
      const loser = (winner === pair.comp1) ? pair.comp2 : pair.comp1;
      competitors.forEach(comp => {
        if (comp.name === winner) comp.wins += 1;
        if (comp.name === loser) comp.losses += 1;
      });
    }

    updateCompetitorsTable();
    calcTeamPoints();
		clearPairings();

    if (competitors.filter(c => c.losses < 2).length > 1) {
      displayPairings();
    } else {
      alert("Competition finished!");
      competitionStarted = false;
			localStorage.setItem("competitionStarted", "false");
      finalizeRoundButton.disabled = true;
			clearPairings();
    }
	emailMatchResults();
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
    let output = "<h3>Team Points (Sum of Wins-Losses)</h3><ul>";
    for (let team in teamTotals) {
      output += `<li>${team}: ${teamTotals[team]} points</li>`;
    }
    output += "</ul>";
    teamPointsDisplay.innerHTML = output;
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


	function savePairings() {
		localStorage.setItem('currentPairings', JSON.stringify(currentPairings));
	}

	function loadPairings() {
		const stored = localStorage.getItem('currentPairings');
		if (stored) {
			currentPairings = JSON.parse(stored);
			return true;
		}
		return false;
	}

	function clearPairings() {
		localStorage.removeItem('currentPairings');
	}

	function emailMatchResults() {
	  // Generate CSV content from the current competitors array.
	  let csvContent = "Name,Team,Wins,Losses\n";
	  competitors.forEach(comp => {
		csvContent += `"${comp.name}","${comp.team}",${comp.wins},${comp.losses}\n`;
	  });

	  // Call EmailJS to send the email.
	  emailjs.send("service_9p60e2f", "template_arqbj1c", {
		subject: "Match Results",
		message: csvContent
	  })
	  .then(function(response) {
		console.log('Email sent successfully!', response.status, response.text);
	  }, function(error) {
		console.error('Failed to send email:', error);
	  });
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
  });

  removeButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    removeCompetitor(name);
    nameInput.value = "";
  });

  sampleButton.addEventListener("click", addSampleTeams);
  eraseButton.addEventListener("click", eraseAllCompetitors);
  
  resetButton.addEventListener("click", () => {
    resetScores();
    competitionStarted = false;
    beginCompetitionButton.disabled = competitors.length === 0;
    finalizeRoundButton.disabled = true;
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
    finalizeRoundButton.disabled = false;
    displayPairings();
  });
  
  finalizeRoundButton.addEventListener("click", finalizeRound);
  
  calcTeamPointsButton.addEventListener("click", calcTeamPoints);
  
  updateCompetitorsTable();
  displayPairings();

});



