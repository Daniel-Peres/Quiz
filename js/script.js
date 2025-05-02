// --- Variáveis Globais ---
let allThemesData = [];
let currentSelectedTheme = null;
let fullQuizData = [];
let quizData = [];
let quizConfig = {};
let desiredQuestionCount = 0;
window.quizFilePath = null; // Track the current quiz file path

// --- Variáveis de Estado ---
let currentQuestionIndex;
let score;
let selectedOptionElement = null;
let isAnswered = false;
let messageTimeout = null;
let countMessageTimeout = null;
let quizJustStarted = true;
let currentPointsPerQuestion = 0; // <<< ADICIONADO AQUI

const QUIZ_STATE_KEY = 'quizGameState'; // Key for localStorage

// --- LocalStorage State Management ---

function saveGameState() {
    // Não salva se o quiz não começou ou se está no meio de uma animação/transição visual complexa
    if (typeof currentQuestionIndex === 'undefined' || currentQuestionIndex < 0 || !quizData || !quizConfig || !window.quizFilePath || document.querySelector('.expanded-correct')) {
        console.log("saveGameState: Estado inválido ou em transição para salvar.");
        return;
    }

    const state = {
        quizFilePath: window.quizFilePath,
        quizConfig: quizConfig,
        quizData: quizData,
        currentQuestionIndex: currentQuestionIndex,
        score: score,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
        console.log("saveGameState: Estado salvo.", state);
    } catch (e) {
        console.error("Erro ao salvar estado no localStorage:", e);
    }
}

function loadGameState() {
    try {
        const savedStateJSON = localStorage.getItem(QUIZ_STATE_KEY);
        if (!savedStateJSON) {
            console.log("loadGameState: Nenhum estado salvo encontrado.");
            return null;
        }

        console.log("loadGameState: Estado encontrado, tentando carregar...");
        const savedState = JSON.parse(savedStateJSON);

        // --- Basic Validation ---
        if (!savedState || typeof savedState !== 'object') throw new Error("Formato inválido.");
        if (typeof savedState.quizFilePath !== 'string' || !savedState.quizFilePath) throw new Error("quizFilePath ausente ou inválido.");
        if (!savedState.quizConfig || typeof savedState.quizConfig !== 'object') throw new Error("quizConfig ausente ou inválido.");
        if (!Array.isArray(savedState.quizData) || savedState.quizData.length === 0) throw new Error("quizData ausente ou inválido.");
        if (typeof savedState.currentQuestionIndex !== 'number' || savedState.currentQuestionIndex < 0) throw new Error("currentQuestionIndex inválido.");
        if (typeof savedState.score !== 'number' || savedState.score < 0) throw new Error("score inválido.");
        if (savedState.currentQuestionIndex >= savedState.quizData.length) throw new Error("currentQuestionIndex fora dos limites para quizData salvo.");

        console.log("loadGameState: Estado carregado e validado com sucesso.", savedState);
        return savedState;

    } catch (e) {
        console.error("Erro ao carregar ou validar estado do localStorage:", e);
        clearGameState(false); // Clear corrupted/invalid state
        return null;
    }
}

function clearGameState(log = true) {
    if (log) console.log("clearGameState: Limpando estado salvo.");
    try {
        localStorage.removeItem(QUIZ_STATE_KEY);
        window.quizFilePath = null;
    } catch (e) {
        console.error("Erro ao limpar estado do localStorage:", e);
    }
}

// --- Function to resume a quiz from saved state ---
function resumeGame(savedState, elements) {
    console.log("resumeGame: Restaurando quiz...", savedState);
    window.quizFilePath = savedState.quizFilePath;
    quizConfig = savedState.quizConfig;
    quizData = savedState.quizData;
    currentQuestionIndex = savedState.currentQuestionIndex;
    score = savedState.score;
    desiredQuestionCount = quizData.length;
    fullQuizData = []; // Clear to avoid using stale full data

    // --- MODIFICAÇÃO: Recalcular pontos por questão ao resumir ---
    // Precisamos garantir que fullQuizData seja carregado para recalcular
    // Esta parte pode precisar buscar o fullQuizData novamente se não estiver disponível
    // Por ora, vamos assumir que a lógica de cálculo em startGame será suficiente
    // ou que o cálculo precisa ser refeito aqui se fullQuizData for carregado.
    // Vamos calcular com base no que temos, mas pode não ser 100% preciso se totalPoints mudou.
    const totalConfigPoints = quizConfig.totalPoints || 0;
    // Tentativa de estimar total de questões se fullQuizData não estiver carregado
    // Isto é IMPRECISO. Idealmente, fullQuizData deveria ser recarregado ou salvo.
    // Usando quizData.length como fallback temporário para evitar erro total.
    const totalQuizQuestionsEstimate = fullQuizData.length > 0 ? fullQuizData.length : quizData.length;
    currentPointsPerQuestion = (totalQuizQuestionsEstimate > 0 && totalConfigPoints > 0) ? (totalConfigPoints / totalQuizQuestionsEstimate) : 1;
    console.log(`Pontos por questão estimados ao resumir: ${currentPointsPerQuestion}`);
    // --- FIM DA MODIFICAÇÃO ---


    isAnswered = false; // Always start fresh on the question
    selectedOptionElement = null;
    quizJustStarted = false;

    showQuizInterface(elements);
    if (elements.quizTitleElement) elements.quizTitleElement.textContent = quizConfig.theme || "Quiz";
    if (elements.resultContainer) elements.resultContainer.classList.add('hide');
    if (elements.scoreContainer) elements.scoreContainer.classList.remove('hide');
    updateScoreDisplay(elements); // Usa o score salvo e o pointsPerQuestion recalculado

    if (elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
    if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');

    showQuestion(quizData[currentQuestionIndex], elements); // This now calls resetCardStates internally
    console.log(`Quiz restaurado na questão ${currentQuestionIndex + 1} de ${quizData.length}.`);
}


// --- Funções ---

function showOnly(elementToShow, selectionArea, quizContainer, questionCountSelection) {
    try {
        if (selectionArea) selectionArea.classList.add('hide');
        if (quizContainer) quizContainer.classList.add('hide');
        if (questionCountSelection) questionCountSelection.classList.add('hide');
        const resumePrompt = document.getElementById('resume-prompt');
        if (resumePrompt) resumePrompt.classList.add('hide');

        if (elementToShow) elementToShow.classList.remove('hide');
    } catch (e) {
        console.error("Erro em showOnly:", e, { elementToShow, selectionArea, quizContainer, questionCountSelection });
    }
}

function showThemeSelectionScreen(elements) {
    console.log("--- showThemeSelectionScreen INICIADA ---");
    clearGameState();
    currentSelectedTheme = null;
    window.quizFilePath = null;
    quizData = [];
    fullQuizData = [];
    quizConfig = {};
    currentQuestionIndex = -1;
    score = 0;
    currentPointsPerQuestion = 0; // Reseta pontos por questão
    if (elements.quizContainer) resetCardStates(elements); // Reset cards if quiz container exists

    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide'); else console.error("themeSelectionContainer não encontrado em showThemeSelectionScreen");
    if (elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide'); else console.error("subthemeSelectionContainer não encontrado em showThemeSelectionScreen");
    if (elements.themeButtonsContainer) {
        elements.themeButtonsContainer.innerHTML = '<p>Carregando temas...</p>';
        loadThemes(elements);
    } else { console.error("themeButtonsContainer não encontrado em showThemeSelectionScreen"); }
}

function showSubthemeSelectionScreen(theme, elements) {
    console.log("--- showSubthemeSelectionScreen INICIADA ---", "Tema:", theme?.name);
    currentSelectedTheme = theme;
    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.add('hide'); else console.warn("themeSelectionContainer não encontrado em showSubtheme");
    if (elements.subthemeSelectionContainer) {
        elements.subthemeSelectionContainer.classList.remove('hide');
    } else { console.error("subthemeSelectionContainer não encontrado em showSubtheme"); return; }
    if (elements.subthemeTitleElement) elements.subthemeTitleElement.textContent = `Escolha um Subtema para: ${theme.name}`; else console.warn("subthemeTitleElement não encontrado");
    populateSubthemeButtons(theme.subThemes, elements);
    console.log("--- showSubthemeSelectionScreen FINALIZADA ---");
}

function showQuizInterface(elements) {
    console.log("showQuizInterface");
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.progressBarIndicator) elements.progressBarIndicator.style.width = '0%'; else console.warn("progressBarIndicator não encontrado");
    if (elements.progressTextElement) elements.progressTextElement.textContent = 'Carregando...'; else console.warn("progressTextElement não encontrado");
    if (elements.progressContainer) elements.progressContainer.classList.remove('hide'); else console.warn("progressContainer não encontrado");
    if (elements.questionContainer) elements.questionContainer.classList.remove('hide'); else console.warn("questionContainer não encontrado");
    if (elements.controlsContainer) elements.controlsContainer.classList.remove('hide'); else console.warn("controlsContainer não encontrado");
}

async function loadThemes(elements) {
    console.log('loadThemes: Iniciando busca...');
    const themesPath = 'data/themes.json';
    try { const r = await fetch(themesPath); if (!r.ok) throw new Error(`HTTP ${r.status}`); allThemesData = await r.json(); if (!Array.isArray(allThemesData)) throw new Error("Formato inválido."); console.log('loadThemes: OK', allThemesData); populateThemeButtons(allThemesData, elements); } catch (e) { console.error("Falha CRÍTICA loadThemes:", e); if (elements.themeButtonsContainer) elements.themeButtonsContainer.innerHTML = `<p style="color:red;">Erro: ${e.message}. Verifique F12.</p>`; }
}

function populateThemeButtons(themes, elements) {
    console.log('pTB'); if (!elements.themeButtonsContainer) { console.error("No themeButtonsContainer."); return; } elements.themeButtonsContainer.innerHTML = ''; if (!themes?.length) { elements.themeButtonsContainer.innerHTML = '<p>Nada encontrado.</p>'; return; } themes.forEach(t => { if (!t?.id || !t.name) { console.warn("Tema inválido:", t); return; } const b = document.createElement('button'); b.className = 'theme-btn'; b.dataset.themeId = t.id; let h = `<strong>${t.name}</strong>`; if (t.description) h += `<span class="description">${t.description}</span>`; b.innerHTML = h; b.addEventListener('click', (e) => handleThemeSelection(e, elements)); elements.themeButtonsContainer.appendChild(b); });
}

function populateSubthemeButtons(subThemes, elements) {
    console.log('pSTB'); if (!elements.subthemeButtonsContainer) { console.error("No subthemeButtonsContainer."); return; } elements.subthemeButtonsContainer.innerHTML = ''; if (!subThemes?.length) { elements.subthemeButtonsContainer.innerHTML = '<p>Nada encontrado.</p>'; return; } subThemes.forEach(st => { if (!st?.file || !st.name) { console.warn("Subtema inválido:", st); return; } const b = document.createElement('button'); b.className = 'theme-btn'; b.dataset.file = st.file; let h = `<strong>${st.name}</strong>`; if (st.description) h += `<span class="description">${st.description}</span>`; b.innerHTML = h; b.addEventListener('click', (e) => handleSubthemeSelection(e, elements)); elements.subthemeButtonsContainer.appendChild(b); });
}

async function loadQuizData(filename, elements) {
    console.log(`loadQuizData: ${filename}`);
    window.quizFilePath = filename;
    fullQuizData = []; quizConfig = {}; desiredQuestionCount = 0; showOnly(null, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer); let lM = document.getElementById('loading-quiz-msg'); if (!lM && elements.mainContainer) { lM = document.createElement('p'); lM.id = 'loading-quiz-msg'; lM.textContent = 'Carregando...'; lM.style.cssText = 'text-align:center;padding:20px;'; elements.mainContainer.appendChild(lM); } else if (lM) { lM.textContent = 'Carregando...'; lM.style.color = 'inherit'; lM.classList.remove('hide'); } const eBB = document.getElementById('back-to-themes-btn-error'); if (eBB) eBB.remove(); const qP = `data/${filename}`; try { console.log(`Workspace: ${qP}`); const r = await fetch(qP); if (!r.ok) throw new Error(`HTTP ${r.status}`); const jD = await r.json(); if (!jD || typeof jD !== 'object') throw new Error("JSON inválido."); if (!jD.config || typeof jD.config !== 'object') throw new Error("Config inválida."); if (!jD.data || !Array.isArray(jD.data)) throw new Error("Data inválido."); if (jD.data.length === 0) throw new Error("Data vazio."); fullQuizData = jD.data; quizConfig = jD.config; console.log(`Quiz '${quizConfig.theme || 'N/A'}' ${fullQuizData.length} Qs.`); if (lM) lM.classList.add('hide'); showQuestionCountSelection(fullQuizData.length, elements); } catch (e) { console.error("Falha loadQuizData:", filename, e); window.quizFilePath = null; if (lM) { lM.textContent = `Erro: ${e.message}`; lM.style.color = 'red'; lM.classList.remove('hide'); } else if (elements.mainContainer) { elements.mainContainer.innerHTML = `<p id="loading-quiz-msg" style="color:red;text-align:center;padding:20px;">Erro: ${e.message}</p>`; lM = document.getElementById('loading-quiz-msg'); } if (lM && !document.getElementById('back-to-themes-btn-error')) { const bB = document.createElement('button'); bB.textContent = 'Voltar'; bB.id = 'back-to-themes-btn-error'; bB.className = 'control-btn back-btn'; bB.style.cssText = 'margin-top:20px;display:block;margin-left:auto;margin-right:auto;'; bB.onclick = () => showThemeSelectionScreen(elements); lM.parentNode.insertBefore(bB, lM.nextSibling); } if (elements.quizContainer) elements.quizContainer.classList.add('hide'); if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide'); }
}

function handleThemeSelection(event, elements) {
    const tId = event.currentTarget.dataset.themeId; console.log("hTS:", tId); const sT = allThemesData.find(t => t && t.id === tId); if (!sT) { console.error(`Tema ${tId} não encontrado.`); return; } if (sT.subThemes?.length > 0) { showSubthemeSelectionScreen(sT, elements); } else if (sT.file) { loadQuizData(sT.file, elements); } else { console.error(`Tema ${sT.name} inválido.`); const ea = elements.messageArea || elements.themeButtonsContainer; if (ea) showMessage(ea, `Config inválida: ${sT.name}.`, 5000); }
}

function handleSubthemeSelection(event, elements) {
    const f = event.currentTarget.dataset.file; console.log("hSTS:", f); if (f) { loadQuizData(f, elements); } else { console.error("No data-file."); const ea = elements.messageArea || elements.subthemeButtonsContainer; if (ea) showMessage(ea, `Erro: arquivo não especificado.`, 5000); }
}

function shuffleArray(array) { if (!Array.isArray(array)) return; for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]]; } }

function showQuestionCountSelection(maxQuestions, elements) {
    console.log("sQCS: Max=", maxQuestions); if (!elements.questionCountSelectionContainer) { console.error("No #qcs."); showThemeSelectionScreen(elements); return; } if (!elements.questionCountButtonsContainer) { console.error("No #qcb."); } showOnly(elements.questionCountSelectionContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer); if (elements.questionCountTitleElement) elements.questionCountTitleElement.textContent = `Quantidade para '${quizConfig.theme || 'quiz'}'?`; if (elements.maxQuestionsInfoElement) elements.maxQuestionsInfoElement.textContent = maxQuestions; if (elements.questionCountMessageArea) clearMessage(elements.questionCountMessageArea, true); if (elements.questionCountButtonsContainer) { elements.questionCountButtonsContainer.innerHTML = ''; const percs = [0.25, 0.5, 0.75, 1.0]; const added = new Set(); percs.forEach(p => { let c = (p === 1.0) ? maxQuestions : Math.max(1, Math.round(maxQuestions * p)); c = Math.min(c, maxQuestions); if (c > 0 && (!added.has(c) || p === 1.0)) { added.add(c); const b = document.createElement('button'); b.className = 'control-btn count-btn'; const pTxt = p === 1.0 ? "Todas" : `${Math.round(p * 100)}%`; b.textContent = `${c} Questões`; b.dataset.count = c; b.addEventListener('click', () => { desiredQuestionCount = parseInt(b.dataset.count); console.log("Num:", desiredQuestionCount); if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide'); startGame(elements); }); elements.questionCountButtonsContainer.appendChild(b); } }); } if (elements.backToSelectionFromCountBtn) { const oB = elements.backToSelectionFromCountBtn; const nB = oB.cloneNode(true); if (oB.parentNode) { oB.parentNode.replaceChild(nB, oB); elements.backToSelectionFromCountBtn = nB; nB.addEventListener('click', () => { console.log(">>> Voltar (contagem) CLICADO!"); console.log("currentSelectedTheme:", currentSelectedTheme); if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide'); if (currentSelectedTheme?.subThemes?.length > 0) { console.log("<<< Voltando SUBTEMAS."); showSubthemeSelectionScreen(currentSelectedTheme, elements); } else { console.log("<<< Voltando TEMAS."); showThemeSelectionScreen(elements); } }); console.log("Listener Voltar (contagem) OK."); } else { console.error("Pai Voltar (contagem) não encontrado."); } } else { console.error("#back-to-selection-from-count-btn não encontrado."); }
}

function startGame(elements) {
    console.log("startGame: Iniciando...");
    quizJustStarted = true;
    const eb = document.getElementById('back-to-themes-btn-error');
    if (eb) eb.remove();
    if (!fullQuizData?.length) {
        console.error("ERRO: start sem fullQuizData.");
        showThemeSelectionScreen(elements);
        return;
    }
    const totalQuizQuestions = fullQuizData.length; // Total de questões disponíveis
    if (desiredQuestionCount <= 0 || desiredQuestionCount > totalQuizQuestions) {
        desiredQuestionCount = totalQuizQuestions;
    }
    let qs = [...fullQuizData];
    shuffleArray(qs);
    quizData = qs.slice(0, desiredQuestionCount); // Questões que serão jogadas

    if (!quizData?.length) {
        console.error("ERRO: quizData vazio.");
        showThemeSelectionScreen(elements);
        return;
    }

    // Calcular pontos por questão e inicializar score
    const totalConfigPoints = quizConfig.totalPoints || 0; // Pontos totais definidos no JSON
    currentPointsPerQuestion = (totalQuizQuestions > 0 && totalConfigPoints > 0) ? (totalConfigPoints / totalQuizQuestions) : 1; // Evita divisão por zero, default 1 ponto
    score = 0; // Inicializa a pontuação em 0
    console.log(`Iniciando com ${quizData.length} de ${totalQuizQuestions} questões.`);
    console.log(`Total de pontos no config: ${totalConfigPoints}`);
    console.log(`Pontos por questão correta: ${currentPointsPerQuestion}`);

    showQuizInterface(elements);
    currentQuestionIndex = 0;
    isAnswered = false;
    selectedOptionElement = null;
    if (elements.messageArea) clearMessage(elements.messageArea);
    if (elements.quizTitleElement) elements.quizTitleElement.textContent = quizConfig.theme || "Quiz";
    if (elements.resultContainer) elements.resultContainer.classList.add('hide');
    if (elements.scoreContainer) elements.scoreContainer.classList.add('hide'); // Esconde pontuação inicial
    if (elements.nextBtn) elements.nextBtn.classList.add('hide');
    if (elements.finishBtn) elements.finishBtn.classList.add('hide');
    if (elements.confirmBtn) { elements.confirmBtn.classList.remove('hide'); elements.confirmBtn.disabled = true; } else console.error("ConfirmBtn não encontrado!");
    if (elements.quizBackBtn) elements.quizBackBtn.classList.remove('hide'); else console.warn("#quiz-back-btn não encontrado.");
    if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.remove('hide'); else console.warn("#quiz-main-menu-btn não encontrado.");

    showQuestion(quizData[currentQuestionIndex], elements);
    saveGameState(); // Salva estado inicial
}


function updateProgressBar(elements) { if (!quizData || !elements.progressBarIndicator || !elements.progressTextElement) return; const t = quizData.length; const c = currentQuestionIndex + 1; if (t === 0) { elements.progressBarIndicator.style.width = '0%'; elements.progressTextElement.textContent = '0/0'; return; } const p = Math.min((c / t) * 100, 100); elements.progressBarIndicator.style.width = `${p}%`; elements.progressTextElement.textContent = `Questão ${c} de ${t}`; }

// Função para resetar completamente os estados visuais dos cards
function resetCardStates(elements) {
    if (!elements || !elements.answerOptionsElement) return;
    console.log("resetCardStates: Resetando todos os estados dos cards.");
    elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(frame => {
        frame.classList.remove('expanded-correct', 'sibling-of-expanded', 'revealed', 'disabled', 'selected');
        frame.style.outline = 'none'; // Limpa outline
        frame.style.zIndex = ''; // Limpa z-index
        frame.style.transform = ''; // Limpa transform inline (se houver)
        const backFace = frame.querySelector('.back-face');
        if (backFace) {
            backFace.classList.remove('correct', 'incorrect'); // Limpa cores do backface
            // Esconde o botão X interno ao resetar
            const closeBtn = backFace.querySelector('.close-expanded-btn');
            if (closeBtn) {
                closeBtn.classList.add('hide'); // Oculta o botão X
            }
        }
        const frontFace = frame.querySelector('.front-face');
        if (frontFace) {
            frontFace.style.display = ''; // Garante que não esteja 'none'
        }
    });
    // REMOVA A LÓGICA DE OCULTAR O CONTÊINER EXTERNO DO BOTÃO FECHAR, POIS ELE FOI REMOVIDO DO HTML
    // if (elements.expandedCardControlsContainer) {
    //    elements.expandedCardControlsContainer.classList.add('hide');
    //    elements.expandedCardControlsContainer.style.top = ''; // <<< Limpa o estilo top inline
    //    console.log("resetCardStates: Container do botão Fechar externo oculto e top resetado.");
    // }
    elements.answerOptionsElement.classList.remove('animating'); // Garante limpeza de estado de animação
}

// Função para resetar apenas o estado expandido
function resetExpandedState(elements) {
    if (!elements || !elements.answerOptionsElement) {
        console.error("resetExpandedState: Elementos inválidos recebidos.");
        return;
    }
    console.log("resetExpandedState: Tentando encontrar .expanded-correct");

    const expanded = elements.answerOptionsElement.querySelector('.expanded-correct');
    if (expanded) {
        console.log("resetExpandedState: Card expandido encontrado.", expanded);
        expanded.classList.remove('expanded-correct');
        expanded.style.zIndex = ''; // Reseta z-index
        // Oculta o botão X interno
        const closeBtn = expanded.querySelector('.close-expanded-btn');
        if (closeBtn) {
            closeBtn.classList.add('hide'); // Oculta o botão X
        }
        console.log("resetExpandedState: Classe 'expanded-correct' removida.");

    } else {
        console.log("resetExpandedState: Nenhum card com .expanded-correct encontrado.");
    }

    // REMOVA A LÓGICA DE OCULTAR O CONTÊINER EXTERNO DO BOTÃO FECHAR
    // if (elements.expandedCardControlsContainer) {
    //     elements.expandedCardControlsContainer.classList.add('hide');
    //     elements.expandedCardControlsContainer.style.top = ''; // <<< Limpa o estilo top inline
    //     console.log("resetExpandedState: Container do botão Fechar externo oculto e top resetado.");
    // } else {
    //      console.warn("resetExpandedState: elements.expandedCardControlsContainer não encontrado.");
    // }
}


// Função para mostrar todos os cards revelados e botões de controle
function revealGridState(elements) {
    if (!elements || !elements.answerOptionsElement) {
        console.error("revealGridState: Elementos inválidos recebidos.");
        return;
    }
    console.log("revealGridState: Iniciando revelação da grade...");

    let framesFound = 0;
    elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(frame => {
        framesFound++;
        frame.classList.remove('expanded-correct', 'sibling-of-expanded'); // Garante limpeza
        frame.classList.add('revealed'); // Adiciona classe para estado revelado
        console.log(`revealGridState: Classe 'revealed' adicionada ao frame:`, frame.dataset.optionText);
        frame.classList.add('disabled'); // Desabilita interação
    });
    console.log(`revealGridState: Processou ${framesFound} frames.`);

    const isLast = currentQuestionIndex >= quizData.length - 1;
    console.log(`revealGridState: É a última questão? ${isLast}. Índice atual: ${currentQuestionIndex}`);

    // Mostrar #finish-btn sempre após a primeira resposta (index >= 0)
    if (elements.finishBtn) {
        if (currentQuestionIndex >= 0) {
            elements.finishBtn.classList.remove('hide');
            console.log(`revealGridState: Botão Finalizar Quiz VISÍVEL (questão ${currentQuestionIndex + 1})`);
        } else {
            elements.finishBtn.classList.add('hide');
            console.log(`revealGridState: Botão Finalizar Quiz OCULTO (antes da primeira resposta)`);
        }
    } else { console.warn("revealGridState: elements.finishBtn não encontrado."); }

    // Mostra/Esconde o botão Próxima apenas se NÃO for a última questão
    if (elements.nextBtn) {
        elements.nextBtn.classList.toggle('hide', isLast);
        console.log(`revealGridState: Botão Próxima ${isLast ? 'oculto' : 'visível'}`);
    } else { console.warn("revealGridState: elements.nextBtn não encontrado."); }

    console.log("revealGridState: Botões de controle atualizados.");
}

// Função showQuestion MODIFICADA para incluir ícones na explicação
function showQuestion(questionData, elements) {
    resetCardStates(elements); // Limpa completamente os estados anteriores
    console.log(`showQ: Idx ${currentQuestionIndex}`);
    isAnswered = false; selectedOptionElement = null;
    if (elements.confirmBtn) {
        elements.confirmBtn.classList.remove('confirm-active');
        elements.confirmBtn.disabled = true; // Garante que confirmar esteja desabilitado
        elements.confirmBtn.classList.remove('hide'); // Garante que confirmar esteja visível
    }
    // Garante que botões de navegação pós-resposta estejam escondidos
    if (elements.nextBtn) elements.nextBtn.classList.add('hide');
    if (elements.finishBtn) elements.finishBtn.classList.add('hide'); // Garante que Finalizar comece escondido

    if (elements.answerOptionsElement) elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(f => f.style.outline = 'none');

    if (!questionData?.question) { console.error("Questão inválida:", currentQuestionIndex, questionData); if (elements.messageArea) showMessage(elements.messageArea, "Erro questão", 5000); showResults(elements); return; }
    if (elements.questionTextElement) elements.questionTextElement.innerText = questionData.question; else console.error("questionTextElement!");
    if (elements.answerOptionsElement) elements.answerOptionsElement.innerHTML = ''; else { console.error("answerOptionsElement!"); return; }
    if (elements.messageArea) clearMessage(elements.messageArea);
    if (!questionData.options?.length) { console.error("Opções inválidas:", questionData); if (elements.messageArea) showMessage(elements.messageArea, "Erro opções", 5000); nextQuestion(elements); return; }

    let opts = [...questionData.options]; shuffleArray(opts);
    opts.forEach(opt => {
        if (!opt?.text) { console.warn("Opção inválida:", opt); return; }
        const oF = document.createElement('div'); oF.className = 'option-frame'; oF.dataset.optionText = opt.text;
        const fF = document.createElement('div'); fF.className = 'front-face'; fF.textContent = opt.text;
        const bF = document.createElement('div'); bF.className = 'back-face'; // Cria a face traseira para TODOS

        // Adiciona a IMAGEM DA OPÇÃO (se houver) à face traseira SOMENTE da opção correta
        if (opt.isCorrect === true && opt.imageUrl) {
            const imgContainer = document.createElement('div'); imgContainer.className = 'option-image-container';
            const imgEl = document.createElement('img'); imgEl.src = opt.imageUrl; imgEl.alt = opt.text; imgEl.className = 'option-image'; imgEl.loading = 'lazy';
            imgContainer.appendChild(imgEl);
            bF.appendChild(imgContainer); // Adiciona ANTES da explicação
        }

        // --- CRIAÇÃO DA EXPLICAÇÃO COM ÍCONE (Lógica Atualizada) ---
        const explanationContainer = document.createElement('div');
        explanationContainer.className = 'explanation-container'; // Container

        const explanationText = opt.explanation || 'Sem explicação.';
        let iconElement = null;
        const textElement = document.createElement('span');
        textElement.className = 'explanation-text'; // Classe para o texto
        textElement.textContent = explanationText; // Usa o texto da explicação completo

        // Verifica diretamente a propriedade isCorrect para decidir o ícone
        if (opt.isCorrect === true) {
            iconElement = document.createElement('img');
            iconElement.src = 'images/resposta_correta.webp'; // Caminho do ícone de correto
            iconElement.alt = 'Correto';
            iconElement.className = 'explanation-icon';
        } else {
            // Para opções incorretas (isCorrect é false, undefined ou qualquer outra coisa)
            iconElement = document.createElement('img');
            iconElement.src = 'images/resposta_incorreta.webp'; // Caminho do ícone de incorreto
            iconElement.alt = 'Incorreto';
            iconElement.className = 'explanation-icon';
        }

        // Adiciona o ícone (sempre presente agora) e o texto ao contêiner
        if (iconElement) { // Embora sempre criado, boa prática verificar
            explanationContainer.appendChild(iconElement); // Adiciona o ícone PRIMEIRO
        }
        explanationContainer.appendChild(textElement); // Adiciona o texto DEPOIS

        bF.appendChild(explanationContainer); // Adiciona o container da explicação à face traseira
        // --- FIM DA CRIAÇÃO DA EXPLICAÇÃO COM ÍCONE (Lógica Atualizada) ---

        // Botão X externo será usado em vez do interno.


        // Monta o card
        oF.appendChild(fF); oF.appendChild(bF);
        // O listener de seleção na option-frame permanece
        oF.addEventListener('click', (e) => selectAnswer(e, elements));
        if (elements.answerOptionsElement) elements.answerOptionsElement.appendChild(oF);
    });

    // Controla visibilidade dos botões Voltar/Menu Principal apenas na primeira questão
    if (quizJustStarted) {
        if (elements.quizBackBtn) elements.quizBackBtn.classList.remove('hide');
        if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.remove('hide');
    } else {
        if (elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
        if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');
    }

    if (elements.questionContainer) elements.questionContainer.classList.remove('hide'); else console.error("questionContainer!");
    updateProgressBar(elements);
}


function selectAnswer(event, elements) {
    if (isAnswered) return;
    if (elements.messageArea) clearMessage(elements.messageArea);
    const clickedFrame = event.currentTarget; if (!clickedFrame) return;

    if (elements.answerOptionsElement) elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(f => {
        if (f !== clickedFrame) f.classList.remove('selected');
    });
    clickedFrame.classList.toggle('selected');

    if (clickedFrame.classList.contains('selected')) {
        selectedOptionElement = clickedFrame;
        if (elements.confirmBtn) { elements.confirmBtn.disabled = false; elements.confirmBtn.classList.add('confirm-active'); }
    } else {
        selectedOptionElement = null;
        if (elements.confirmBtn) { elements.confirmBtn.disabled = true; elements.confirmBtn.classList.remove('confirm-active'); }
    }
}

// ============================================================== //
// ============= FUNÇÃO confirmAnswer MODIFICADA ================ //
// ============================================================== //
function confirmAnswer(elements) {
    console.log('confirmAnswer: Iniciando...');
    // Mantém as verificações iniciais
    if (!selectedOptionElement) {
        if (elements.messageArea) showMessage(elements.messageArea, "Selecione uma opção.", 3000);
        return;
    }
    if (isAnswered) {
        console.warn('confirmAnswer: Já respondido.');
        return;
    }
    isAnswered = true;
    quizJustStarted = false; // Marca que o quiz progrediu
    // Esconde botões que não devem aparecer após a resposta
    if (elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
    if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');
    if (elements.confirmBtn) { elements.confirmBtn.classList.add('hide'); elements.confirmBtn.disabled = true; elements.confirmBtn.classList.remove('confirm-active'); }
    if (elements.messageArea) clearMessage(elements.messageArea);

    try {
        const selTxt = selectedOptionElement.dataset.optionText;
        if (typeof selTxt === 'undefined') throw new Error("Dataset da opção selecionada não encontrado.");
        if (!quizData?.[currentQuestionIndex]?.options) throw new Error(`Dados da questão ${currentQuestionIndex} não encontrados.`);

        const opts = quizData[currentQuestionIndex].options;
        const correctOpt = opts.find(o => o?.isCorrect === true);
        if (!correctOpt?.text) throw new Error(`Opção correta para questão ${currentQuestionIndex} não encontrada.`);

        const correctTxt = correctOpt.text;
        const isCorrect = (selTxt === correctTxt);

        // --- Atualização de Score (Apenas se correto) ---
        if (isCorrect) {
            score += currentPointsPerQuestion;
            console.log(`Score atualizado por ${currentPointsPerQuestion}. Novo score: ${Math.round(score)}`);
        }

        // --- Processa Todos os Cards ---
        const allFrames = elements.answerOptionsElement ? Array.from(elements.answerOptionsElement.querySelectorAll('.option-frame')) : [];
        console.log('confirmAnswer: Marcando cards disabled e cores...');
        allFrames.forEach(f => {
            if (!(f instanceof HTMLElement)) return;
            const fTxt = f.dataset.optionText;
            if (typeof fTxt === 'undefined') return;
            const oData = opts.find(o => o?.text === fTxt);

            f.classList.add('disabled'); // Desabilita todos os cards

            // Define a cor do fundo da face traseira (verde para correta, vermelha para incorreta)
            const backFace = f.querySelector('.back-face');
            if (backFace && oData) {
                backFace.classList.toggle('correct', oData.isCorrect === true);
                backFace.classList.toggle('incorrect', oData.isCorrect !== true);
            } else if (backFace) {
                backFace.classList.add('incorrect'); // Segurança
            }

            // Adiciona outline ao card selecionado pelo usuário
            if (f === selectedOptionElement) {
                f.style.outline = '3px solid #333'; f.style.outlineOffset = '2px';
            } else {
                f.style.outline = 'none';
            }
        });
        console.log('confirmAnswer: Cores e disabled aplicados.');

        // --- Atualiza e Mostra Score ---
        updateScoreDisplay(elements);
        saveGameState();
        if (elements.scoreContainer) elements.scoreContainer.classList.remove('hide');

        // --- LÓGICA DE EXPANSÃO MODIFICADA ---
        // Expande SEMPRE o card SELECIONADO pelo usuário
        console.log('confirmAnswer: Iniciando expansão do card SELECIONADO...');
        if (selectedOptionElement) { // Garante que temos um elemento selecionado
            requestAnimationFrame(() => { // Ajuda a garantir que o navegador processe as mudanças de estilo antes da animação
                requestAnimationFrame(() => { // Segunda camada pode ajudar em alguns casos
                    console.log('confirmAnswer: Aplicando classe expanded-correct ao card selecionado.');
                    // Aplica a classe que aciona a expansão CSS ao card que o usuário clicou
                    selectedOptionElement.classList.add('expanded-correct');
                    selectedOptionElement.style.zIndex = 1000; // Garante que fique na frente

                    // --- MOSTRA O BOTÃO FECHAR (X) INTERNO ---
                    const closeBtn = selectedOptionElement.querySelector('.close-expanded-btn');
                    if (closeBtn) {
                        closeBtn.classList.remove('hide'); // Mostra o botão X interno
                    }

                    // REMOVA A LÓGICA DE POSICIONAMENTO DO BOTÃO EXTERNO QUE ESTAVA AQUI ANTES.
                    // A posição do botão Fechar (X) agora é controlada puramente pelo CSS
                    // quando a classe expanded-correct é aplicada ao option-frame.
                    // A lógica de revelar o grid state acontecerá APENAS quando o botão X for clicado
                    // (listener adicionado na função showQuestion).

                });
            });
        } else {
            // Caso algo dê muito errado e não haja selectedOptionElement
            console.error("confirmAnswer: Card selecionado não encontrado para expansão! Revelando grade.");
            revealGridState(elements); // Mostra o grid normal como fallback
        }
        // --- FIM DA LÓGICA DE EXPANSÃO MODIFICADA ---

        // A lógica antiga que só expandia se isCorrect foi removida.
        // A função revealGridState() só será chamada agora quando o usuário clicar no botão "Fechar Detalhes".

    } catch (err) {
        console.error("ERRO em confirmAnswer:", err);
        if (elements.messageArea) showMessage(elements.messageArea, `Erro: ${err.message}.`, 6000);
        // Reseta o estado visual em caso de erro grave
        resetCardStates(elements);
        if (elements.finishBtn) elements.finishBtn.classList.add('hide');
        if (elements.nextBtn) elements.nextBtn.classList.add('hide');
    }
}
// ============================================================== //
// ============ FIM DA FUNÇÃO confirmAnswer MODIFICADA ========== //
// ============================================================== //


function nextQuestion(elements) {
    console.log("nextQuestion", currentQuestionIndex);
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
        showQuestion(quizData[currentQuestionIndex], elements);
    } else {
        showResults(elements);
    }
}

function showResults(elements) {
    clearGameState();
    console.log("showResults");
    if (elements.quizContainer) resetCardStates(elements);
    if (elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
    if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.questionContainer) elements.questionContainer.classList.add('hide');
    if (elements.progressContainer) elements.progressContainer.classList.add('hide');
    if (elements.controlsContainer) elements.controlsContainer.classList.add('hide');
    if (elements.messageArea) clearMessage(elements.messageArea);
    if (!elements.resultContainer) { console.error("No result container!"); if (elements.scoreContainer) elements.scoreContainer.classList.remove('hide'); updateScoreDisplay(elements); return; }
    elements.resultContainer.classList.remove('hide');
    if (elements.scoreContainer) elements.scoreContainer.classList.remove('hide'); // Garante que o score final seja visível

    const totalQPlayed = quizData.length;
    let finalScoreString = "";
    let correctAnswers = 0; // Precisamos calcular acertos

    if (quizConfig.scoring === "percentage") {
        // Se score acumula pontos, recalcula acertos baseado em pontos por questão
        correctAnswers = (currentPointsPerQuestion > 0) ? Math.round(score / currentPointsPerQuestion) : 0;
        const percentage = totalQPlayed > 0 ? Math.round((correctAnswers / totalQPlayed) * 100) : 0;
        finalScoreString = `Percentual: <strong>${percentage}%</strong>`;

    } else { // Modo "points"
        // Calcula máximo para este quiz
        const totalConfigPoints = quizConfig.totalPoints || 0;
        const totalQuizQuestions = fullQuizData.length;
        const questionsPlayed = quizData.length;
        const maxPointsForThisQuiz = (totalQuizQuestions > 0 && questionsPlayed > 0)
            ? Math.round(totalConfigPoints * (questionsPlayed / totalQuizQuestions))
            : Math.round(questionsPlayed * currentPointsPerQuestion);

        const currentScoreRounded = Math.round(score);

        elements.scoreValueElement.textContent = `${currentScoreRounded} / ${maxPointsForThisQuiz}`;
        elements.pointsDisplayContainer.classList.remove('hide');
        elements.percentageDisplayContainer.classList.add('hide');
    }
    elements.resultContainer.innerHTML = `<h2>Quiz '${quizConfig.theme || 'Quiz'}' Finalizado!</h2>
                                         <p>Acertos: <strong>${correctAnswers}</strong> de <strong>${totalQPlayed}</strong>.</p>
                                         <p>${finalScoreString}</p>
                                         <button id="choose-another-theme-btn" class="control-btn back-btn" style="background-color:#007bff;color:white;">Jogar Novamente</button>`;

    const btn = document.getElementById('choose-another-theme-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            if (elements.resultContainer) elements.resultContainer.classList.add('hide');
            if (elements.scoreContainer) elements.scoreContainer.classList.add('hide');
            showThemeSelectionScreen(elements);
        });
    } else console.error("#choose-another-theme-btn não encontrado.");

    updateScoreDisplay(elements); // Atualiza a exibição final do score no #score-container
}


function updateScoreDisplay(elements) {
    console.log("updateScoreDisplay");
    if (!elements.scoreContainer || !elements.pointsDisplayContainer || !elements.percentageDisplayContainer || !elements.scoreValueElement || !elements.scorePercentageElement) {
        console.error("Score elements missing."); return;
    }
    if (!quizConfig?.scoring) {
        console.warn("Scoring config missing.");
        elements.pointsDisplayContainer.classList.add('hide');
        elements.percentageDisplayContainer.classList.add('hide');
        elements.scoreContainer.classList.remove('hide'); // Mostra o container vazio? Ou esconde?
        return;
    }

    const isPerc = quizConfig.scoring === "percentage";

    if (isPerc) {
        // Calcula percentual baseado em acertos (recalculados de score)
        const numQ = quizData.length;
        let correctAnswers = (currentPointsPerQuestion > 0) ? Math.round(score / currentPointsPerQuestion) : 0;
        if (numQ > 0) {
            const percentage = Math.round((correctAnswers / numQ) * 100);
            elements.scorePercentageElement.textContent = percentage;
            elements.percentageDisplayContainer.classList.remove('hide');
            elements.pointsDisplayContainer.classList.add('hide');
        } else {
            elements.scorePercentageElement.textContent = "0";
        }

    } else { // Modo "points"
        const totalConfigPoints = quizConfig.totalPoints || 0;
        const totalQuizQuestions = fullQuizData.length;
        const questionsPlayed = quizData.length;
        const maxPointsForThisQuiz = (totalQuizQuestions > 0 && questionsPlayed > 0)
            ? Math.round(totalConfigPoints * (questionsPlayed / totalQuizQuestions))
            : Math.round(questionsPlayed * currentPointsPerQuestion);

        const currentScoreRounded = Math.round(score);

        elements.scoreValueElement.textContent = `${currentScoreRounded} / ${maxPointsForThisQuiz}`;
        elements.pointsDisplayContainer.classList.remove('hide');
        elements.percentageDisplayContainer.classList.add('hide');
    }
    elements.scoreContainer.classList.remove('hide');
}


function calculateFinalScoreString() {
    // Esta função ficou mais simples, apenas retorna a pontuação ou percentual formatado para o resultado final
    // A lógica de cálculo do MÁXIMO foi movida para updateScoreDisplay e showResults
    console.log("calcFinalScoreString (simplificada)");
    if (!quizConfig?.scoring || !quizData) { return "N/A"; }
    const numQ = quizData.length;
    if (numQ === 0) return "0";
    if (typeof score !== 'number' || isNaN(score)) return "Erro";

    let scoreStr = "Erro";
    try {
        if (quizConfig.scoring === "percentage") {
            let correctAnswers = (currentPointsPerQuestion > 0) ? Math.round(score / currentPointsPerQuestion) : 0;
            scoreStr = `${Math.round((correctAnswers / numQ) * 100)}%`;
        } else { // "points"
            // A string completa "X / Y pontos" é montada em showResults
            // Aqui podemos retornar só o valor, ou a string completa se preferir centralizar
            scoreStr = `${Math.round(score)} pontos`; // Retorna só o valor acumulado (arredondado)
        }
    } catch (e) {
        console.error("Erro calc score:", e);
        scoreStr = "Erro";
    }
    return scoreStr;
}


function showMessage(messageAreaElement, message, duration = 3000, isError = true, useSpecificTimeout = false) { if (!(messageAreaElement instanceof Element)) { console.warn("showMessage: Elem inválido."); return; } let timeoutVar = useSpecificTimeout ? countMessageTimeout : messageTimeout; const setter = (nT) => { if (useSpecificTimeout) countMessageTimeout = nT; else messageTimeout = nT; }; if (timeoutVar) { clearTimeout(timeoutVar); setter(null); } messageAreaElement.textContent = message; messageAreaElement.className = 'message-area'; messageAreaElement.classList.add(isError ? 'error' : 'success'); messageAreaElement.classList.remove('hide'); const nTID = setTimeout(() => { messageAreaElement.classList.add('hide'); messageAreaElement.textContent = ''; messageAreaElement.classList.remove('error', 'success'); setter(null); }, duration); setter(nTID); }

function clearMessage(messageAreaElement, useSpecificTimeout = false) { if (!(messageAreaElement instanceof Element)) return; let timeoutVar = useSpecificTimeout ? countMessageTimeout : messageTimeout; const setter = (nT) => { if (useSpecificTimeout) countMessageTimeout = nT; else messageTimeout = nT; }; if (timeoutVar) { clearTimeout(timeoutVar); setter(null); } messageAreaElement.classList.add('hide'); messageAreaElement.textContent = ''; messageAreaElement.classList.remove('error', 'success'); }

// --- Inicialização DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Configurando interface...");

    // Element Retrieval (AJUSTADO - removido endQuizEarlyBtn e elementos do botão Fechar externo)
    const elements = {
        mainContainer: document.querySelector('.main-container'),
        selectionArea: document.getElementById('selection-area'),
        themeSelectionContainer: document.getElementById('theme-selection-container'),
        themeButtonsContainer: document.getElementById('theme-buttons'),
        subthemeSelectionContainer: document.getElementById('subtheme-selection-container'),
        subthemeTitleElement: document.getElementById('subtheme-title'),
        subthemeButtonsContainer: document.getElementById('subtheme-buttons'),
        backToThemesBtn: document.getElementById('back-to-themes-btn'),
        questionCountSelectionContainer: document.getElementById('question-count-selection'),
        questionCountTitleElement: document.getElementById('question-count-title'),
        maxQuestionsInfoElement: document.getElementById('max-questions-info'),
        questionCountButtonsContainer: document.getElementById('question-count-buttons'),
        backToSelectionFromCountBtn: document.getElementById('back-to-selection-from-count-btn'),
        questionCountMessageArea: document.getElementById('question-count-message'),
        quizContainer: document.getElementById('quiz-container'),
        quizTitleElement: document.getElementById('quiz-title'),
        quizBackBtn: document.getElementById('quiz-back-btn'),
        quizMainMenuBtn: document.getElementById('quiz-main-menu-btn'),
        progressContainer: document.getElementById('progress-container'),
        progressBarIndicator: document.getElementById('progress-bar-indicator'),
        progressTextElement: document.getElementById('progress-text'),
        questionContainer: document.getElementById('question-container'),
        questionTextElement: document.getElementById('question-text'),
        answerOptionsElement: document.getElementById('answer-options'),
        messageArea: document.getElementById('message-area'),
        controlsContainer: document.querySelector('.controls'),
        confirmBtn: document.getElementById('confirm-btn'),
        nextBtn: document.getElementById('next-btn'),
        finishBtn: document.getElementById('finish-btn'),
        scoreContainer: document.getElementById('score-container'),
        scoreValueElement: document.getElementById('score-value'),
        scorePercentageElement: document.getElementById('percentage-score-display'),
        pointsDisplayContainer: document.getElementById('points-score-display'),
        percentageDisplayContainer: document.getElementById('percentage-score-display'),
        resultContainer: document.getElementById('result-container'),
        resumePromptContainer: document.getElementById('resume-prompt'),
        resumeYesBtn: document.getElementById('resume-yes-btn'),
        resumeNoBtn: document.getElementById('resume-no-btn'),
        // REMOVIDOS: expandedCardControlsContainer, closeExpandedCardBtn
    };

    const savedState = loadGameState();
    if (savedState && elements.resumePromptContainer && elements.resumeYesBtn && elements.resumeNoBtn) {
        console.log("Estado salvo encontrado.");
        elements.selectionArea.classList.add('hide');
        const promptMsg = elements.resumePromptContainer.querySelector('p');
        if (promptMsg) {
            promptMsg.textContent = `Deseja continuar o quiz anterior sobre '${savedState.quizConfig?.theme || 'desconhecido'}'?`;
        }
        elements.resumePromptContainer.classList.remove('hide');

        elements.resumeYesBtn.replaceWith(elements.resumeYesBtn.cloneNode(true));
        elements.resumeNoBtn.replaceWith(elements.resumeNoBtn.cloneNode(true));
        const newYesBtn = document.getElementById('resume-yes-btn');
        const newNoBtn = document.getElementById('resume-no-btn');

        if (newYesBtn) {
            newYesBtn.onclick = () => {
                elements.resumePromptContainer.classList.add('hide');
                // A função resumeGame agora tenta recalcular pontos por questão
                resumeGame(savedState, elements);
            };
        } else { console.error("#resume-yes-btn não encontrado após clonagem"); }

        if (newNoBtn) {
            newNoBtn.onclick = () => {
                elements.resumePromptContainer.classList.add('hide');
                clearGameState();
                showThemeSelectionScreen(elements);
            };
        } else { console.error("#resume-no-btn não encontrado após clonagem"); }

    } else {
        if (savedState) {
            console.warn("Estado salvo encontrado, mas elementos #resume-prompt/#resume-yes-btn/#resume-no-btn não existem no HTML. Iniciando normalmente.");
            clearGameState();
        } else {
            console.log("Nenhum estado salvo válido encontrado. Iniciando normalmente.");
        }
        showThemeSelectionScreen(elements);
    }

    // Listeners
    if (elements.backToThemesBtn) { elements.backToThemesBtn.addEventListener('click', () => { console.log(">>> Voltar (subtema) CLICADO!"); showThemeSelectionScreen(elements); }); } else console.error("Listener #back-to-themes-btn FALHOU.");
    if (elements.quizBackBtn) {
        elements.quizBackBtn.addEventListener('click', () => {
            console.log("Voltar (quiz->contagem/temas) clicado.");
            clearGameState();
            if (window.quizFilePath && fullQuizData && fullQuizData.length > 0 && elements.questionCountSelectionContainer) {
                showQuestionCountSelection(fullQuizData.length, elements);
            } else {
                showThemeSelectionScreen(elements);
            }
        });
    } else console.warn("#quiz-back-btn não encontrado ou removido intencionalmente.");

    // CORREÇÃO DO ERRO DE SINTAXE AQUI:
    if (elements.quizMainMenuBtn) {
        elements.quizMainMenuBtn.addEventListener('click', () => {
            console.log("Menu Principal (quiz) clicado.");
            showThemeSelectionScreen(elements);
        });
    } else { // Este else pertence ao if que verifica elements.quizMainMenuBtn
        console.warn("#quiz-main-menu-btn não encontrado ou removido intencionalmente.");
    }


    if (elements.confirmBtn) elements.confirmBtn.addEventListener('click', () => confirmAnswer(elements)); else console.error("#confirm-btn não encontrado!");
    if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => nextQuestion(elements)); else console.warn("#next-btn não encontrado.");

    // Listener para #finish-btn (com confirmação)
    if (elements.finishBtn) {
        const newFinishBtn = elements.finishBtn.cloneNode(true);
        elements.finishBtn.parentNode.replaceChild(newFinishBtn, elements.finishBtn);
        elements.finishBtn = newFinishBtn;

        elements.finishBtn.addEventListener('click', () => {
            console.log("'Finalizar Quiz' clicado.");
            // A pontuação exibida na confirmação será calculada agora com base no estado atual
            const totalConfigPoints = quizConfig.totalPoints || 0;
            const totalQuizQuestions = fullQuizData.length;
            const questionsPlayed = quizData.length;
            const maxPointsForThisQuiz = (totalQuizQuestions > 0 && questionsPlayed > 0)
                ? Math.round(totalConfigPoints * (questionsPlayed / totalQuizQuestions))
                : Math.round(questionsPlayed * currentPointsPerQuestion);
            const currentScoreRounded = Math.round(score);
            const currentScoreString = `${currentScoreRounded} / ${maxPointsForThisQuiz} pontos`; // Formato para confirmação

            const isReallyLastQuestion = currentQuestionIndex >= quizData.length - 1;
            let confirmationMessage = `Tem certeza que deseja finalizar o quiz agora?`;

            if (!isReallyLastQuestion) {
                confirmationMessage += `\nSua pontuação atual é: ${currentScoreString}.\nEsta pontuação será registrada como final.`;
                if (window.confirm(confirmationMessage)) {
                    console.log("Finalização antecipada confirmada via #finish-btn.");
                    showResults(elements);
                } else {
                    console.log("Finalização antecipada cancelada.");
                }
            } else {
                console.log("Finalizando na última questão via #finish-btn.");
                showResults(elements);
            }
        });
        console.log("Listener atualizado para #finish-btn OK (com confirmação).");
    } else {
        console.warn("#finish-btn não encontrado.");
    }

    // REMOVIDO: Listener para #close-expanded-card-btn externo
    // if (elements.closeExpandedCardBtn) { ... }
    // REMOVIDO: console.log("Listener para #close-expanded-card-btn adicionado.");

    const now = new Date(); let options = { hour12: false, timeZone: 'America/Sao_Paulo' }; try { options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { } console.log(`Interface JS pronta: ${now.toLocaleString('pt-BR', options)} (${options.timeZone})`);
});


// === BOTÃO FECHAR EXPANDIDO EXTERNO ===
const externalCloseBtn = document.createElement('div');
externalCloseBtn.id = 'external-close-btn';
externalCloseBtn.innerHTML = '&times;';
externalCloseBtn.classList.add('hide');
document.body.appendChild(externalCloseBtn);

externalCloseBtn.addEventListener('click', () => {
    const expanded = document.querySelector('.option-frame.expanded-correct');
    if (expanded) {
        expanded.classList.remove('expanded-correct');
        expanded.style.zIndex = '';
        revealGridState(window.quizElements || {}); // Usa global de referência
        externalCloseBtn.classList.add('hide');
    }
});

function positionExternalCloseBtn() {
    const expanded = document.querySelector('.option-frame.expanded-correct');
    if (!expanded) {
        externalCloseBtn.classList.add('hide');
        return;
    }

    const rect = expanded.getBoundingClientRect();
    const btnSize = 36; // largura/altura do botão
    const offset = 10;   // margem superior e direita
    externalCloseBtn.style.top = `${window.scrollY + rect.top + offset}px`;
    externalCloseBtn.style.left = `${window.scrollX + rect.left + rect.width - offset - btnSize}px`;
    externalCloseBtn.classList.remove('hide');

}

window.addEventListener('resize', positionExternalCloseBtn);
window.addEventListener('scroll', positionExternalCloseBtn);

// Reposiciona quando um card é expandido
const originalConfirmAnswer = confirmAnswer;
confirmAnswer = function (elements) {
    originalConfirmAnswer(elements);
    setTimeout(positionExternalCloseBtn, 850); // Espera a animação
    window.quizElements = elements; // Salva referência para uso externo
};
