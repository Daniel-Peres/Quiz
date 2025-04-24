// --- Variáveis Globais ---
let allThemesData = [];
let currentSelectedTheme = null;
let fullQuizData = []; // Armazena todas as questões carregadas
let quizData = []; // Armazena as questões selecionadas para a rodada
let quizConfig = {};
let desiredQuestionCount = 0; // Quantidade de questões desejada pelo usuário

// --- Variáveis de Estado ---
let currentQuestionIndex;
let score;
let selectedOptionElement = null;
let isAnswered = false;
let messageTimeout = null; // Para mensagens gerais
let countMessageTimeout = null; // Para mensagens na tela de contagem

// --- Funções ---

/**
 * Mostra apenas um container principal e esconde os outros.
 * @param {HTMLElement | null} elementToShow - O elemento principal a ser mostrado.
 * @param {HTMLElement} selectionArea - Container da seleção de tema/subtema.
 * @param {HTMLElement} quizContainer - Container principal do quiz.
 * @param {HTMLElement} questionCountSelection - Container da seleção de quantidade.
 */
function showOnly(elementToShow, selectionArea, quizContainer, questionCountSelection) {
    console.log("showOnly called. Showing:", elementToShow ? elementToShow.id : 'null');
    if (selectionArea) selectionArea.classList.add('hide');
    if (quizContainer) quizContainer.classList.add('hide');
    if (questionCountSelection) questionCountSelection.classList.add('hide');
    if (elementToShow) elementToShow.classList.remove('hide');
}

/**
 * Mostra a tela inicial de seleção de temas.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showThemeSelectionScreen(elements) {
    console.log("showThemeSelectionScreen");
    currentSelectedTheme = null; // Limpa tema pai ao voltar aqui
    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');
    if (elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
    if (elements.themeButtonsContainer) {
        elements.themeButtonsContainer.innerHTML = '<p>Carregando temas...</p>';
        loadThemes(elements);
    } else {
        console.error("Elemento themeButtonsContainer não encontrado!");
    }
}

/**
 * Mostra a tela de seleção de subtemas para um tema específico.
 * @param {object} theme - O objeto do tema pai selecionado.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showSubthemeSelectionScreen(theme, elements) {
    currentSelectedTheme = theme;
    console.log("showSubthemeSelectionScreen for theme:", theme.name);
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.add('hide');
    if (elements.subthemeTitleElement) elements.subthemeTitleElement.textContent = `Escolha um Subtema para: ${theme.name}`;
    else { console.warn("subthemeTitleElement não encontrado"); }
    populateSubthemeButtons(theme.subThemes, elements);
    if (elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.remove('hide');
    else { console.error("subthemeSelectionContainer não encontrado!"); }
}

/**
 * Mostra a interface principal do quiz (barra, pergunta, opções, controles).
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showQuizInterface(elements) {
    console.log("showQuizInterface");
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.progressBarIndicator) elements.progressBarIndicator.style.width = '0%';
    else { console.warn("progressBarIndicator não encontrado"); }
    if (elements.progressTextElement) elements.progressTextElement.textContent = 'Carregando...';
    else { console.warn("progressTextElement não encontrado"); }
    if (elements.progressContainer) elements.progressContainer.classList.remove('hide');
    else { console.warn("progressContainer não encontrado"); }
    if (elements.questionContainer) elements.questionContainer.classList.remove('hide');
    else { console.warn("questionContainer não encontrado"); }
    if (elements.controlsContainer) elements.controlsContainer.classList.remove('hide');
    else { console.warn("controlsContainer não encontrado"); }
}

/**
 * Carrega a lista de temas do arquivo JSON principal.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
async function loadThemes(elements) {
    console.log('loadThemes: Iniciando busca...');
    // 3. VERIFIQUE SE A PASTA 'data' EXISTE E CONTÉM themes.json
    const themesPath = 'data/themes.json';
    try {
        const response = await fetch(themesPath);
        if (!response.ok) throw new Error(`Erro HTTP ${response.status} ao buscar ${themesPath}`);
        allThemesData = await response.json();
        if (!Array.isArray(allThemesData)) throw new Error("Formato inválido de themes.json (não é um array).");
        console.log('loadThemes: Dados parseados:', allThemesData);
        populateThemeButtons(allThemesData, elements);
    } catch (error) {
        console.error("Falha CRÍTICA ao carregar themes.json:", error);
        if (elements.themeButtonsContainer) {
             elements.themeButtonsContainer.innerHTML = `<p style="color: red;">Erro ao carregar temas: ${error.message}. Verifique o console (F12) e o caminho '${themesPath}'.</p>`;
        }
    }
}

/**
 * Cria os botões de seleção de tema na interface.
 * @param {Array} themes - Array com os objetos de tema.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function populateThemeButtons(themes, elements) {
    console.log('populateThemeButtons');
    if (!elements.themeButtonsContainer) { console.error("themeButtonsContainer não existe."); return; }
    elements.themeButtonsContainer.innerHTML = ''; // Limpa
    if (!themes || themes.length === 0) { elements.themeButtonsContainer.innerHTML = '<p>Nenhum tema encontrado.</p>'; return; }
    themes.forEach(theme => {
        if (!theme || !theme.id || !theme.name) { console.warn("Tema inválido (sem id/nome):", theme); return; }
        const button = document.createElement('button'); button.className = 'theme-btn'; button.dataset.themeId = theme.id;
        let buttonHTML = `<strong>${theme.name}</strong>`; if (theme.description) buttonHTML += `<span class="description">${theme.description}</span>`;
        button.innerHTML = buttonHTML; button.addEventListener('click', (event) => handleThemeSelection(event, elements));
        elements.themeButtonsContainer.appendChild(button);
    });
}

/**
 * Cria os botões de seleção de subtema na interface.
 * @param {Array} subThemes - Array com os objetos de subtema.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function populateSubthemeButtons(subThemes, elements) {
     console.log('populateSubthemeButtons');
     if (!elements.subthemeButtonsContainer) { console.error("subthemeButtonsContainer não existe."); return; }
     elements.subthemeButtonsContainer.innerHTML = ''; // Limpa
     if (!subThemes || !Array.isArray(subThemes) || subThemes.length === 0) { elements.subthemeButtonsContainer.innerHTML = '<p>Nenhum subtema encontrado.</p>'; return; }
     subThemes.forEach(subTheme => {
         if(!subTheme || !subTheme.file || !subTheme.name) { console.warn("Subtema inválido (sem file/nome):", subTheme); return; }
         const button = document.createElement('button'); button.className = 'theme-btn'; button.dataset.file = subTheme.file;
         let buttonHTML = `<strong>${subTheme.name}</strong>`; if (subTheme.description) buttonHTML += `<span class="description">${subTheme.description}</span>`;
         button.innerHTML = buttonHTML; button.addEventListener('click', (event) => handleSubthemeSelection(event, elements));
         elements.subthemeButtonsContainer.appendChild(button);
     });
}

/**
 * Carrega os dados (config e questões) de um arquivo JSON de quiz específico.
 * @param {string} filename - O caminho relativo do arquivo JSON do quiz (dentro da pasta 'data').
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
async function loadQuizData(filename, elements) {
    console.log(`Iniciando carregamento do quiz: ${filename}`);
    fullQuizData = []; quizConfig = {}; desiredQuestionCount = 0;
    showOnly(null, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    let loadingMsgElement = document.getElementById('loading-quiz-msg');
    if (!loadingMsgElement && elements.mainContainer) {
        loadingMsgElement = document.createElement('p'); loadingMsgElement.id = 'loading-quiz-msg';
        loadingMsgElement.textContent = 'Carregando dados do quiz...'; loadingMsgElement.style.textAlign = 'center'; loadingMsgElement.style.padding = '20px';
        elements.mainContainer.appendChild(loadingMsgElement);
    } else if (loadingMsgElement) {
         loadingMsgElement.textContent = 'Carregando dados do quiz...'; loadingMsgElement.style.color = 'inherit'; loadingMsgElement.classList.remove('hide');
    }
    const errorBackButton = document.getElementById('back-to-themes-btn-error'); if (errorBackButton) errorBackButton.remove();
    // 4. VERIFIQUE SE A PASTA 'data' E OS CAMINHOS INTERNOS (ex: data/aws/...) ESTÃO CORRETOS
    const quizPath = `data/${filename}`;
    try {
        console.log(`Buscando arquivo em: ${quizPath}`);
        const response = await fetch(quizPath);
        if (!response.ok) throw new Error(`Falha ao buscar '${filename}' (Status: ${response.status}) em ${quizPath}`);
        const jsonData = await response.json();
        if (!jsonData || typeof jsonData !== 'object') throw new Error("Arquivo JSON vazio ou inválido.");
        if (!jsonData.config || typeof jsonData.config !== 'object') throw new Error("Configuração ('config') ausente/inválida no JSON.");
        if (!jsonData.data || !Array.isArray(jsonData.data)) throw new Error("Dados das questões ('data') ausentes/inválidos (não é um array) no JSON.");
        if (jsonData.data.length === 0) throw new Error("Arquivo JSON não contém questões (array 'data' está vazio).");
        fullQuizData = jsonData.data; quizConfig = jsonData.config;
        console.log(`Quiz '${quizConfig.theme || 'Sem Título'}' pré-carregado com ${fullQuizData.length} questões.`);
        if (loadingMsgElement) loadingMsgElement.classList.add('hide');
        showQuestionCountSelection(fullQuizData.length, elements); // Chama seleção de quantidade
    } catch (error) {
        console.error("Falha CRÍTICA ao carregar ou processar dados do quiz:", filename, error);
        if (loadingMsgElement) { loadingMsgElement.textContent = `Erro ao carregar '${filename}': ${error.message}. Verifique console e arquivo JSON.`; loadingMsgElement.style.color = 'red'; loadingMsgElement.classList.remove('hide'); }
        else if (elements.mainContainer) { elements.mainContainer.innerHTML = `<p id="loading-quiz-msg" style="color: red; text-align: center; padding: 20px;">Erro ao carregar '${filename}': ${error.message}.</p>`; loadingMsgElement = document.getElementById('loading-quiz-msg'); }
        if (loadingMsgElement && !document.getElementById('back-to-themes-btn-error')) {
            const backButton = document.createElement('button'); backButton.textContent = 'Voltar à Seleção'; backButton.id = 'back-to-themes-btn-error'; backButton.className = 'control-btn back-btn'; backButton.style.cssText = 'margin-top: 20px; display: block; margin-left: auto; margin-right: auto;';
            backButton.onclick = () => showThemeSelectionScreen(elements); loadingMsgElement.parentNode.insertBefore(backButton, loadingMsgElement.nextSibling);
        }
        if(elements.quizContainer) elements.quizContainer.classList.add('hide'); if(elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
    }
}

/**
 * Lida com o clique em um botão de tema principal.
 * @param {Event} event - O evento de clique.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function handleThemeSelection(event, elements) {
    const themeId = event.currentTarget.dataset.themeId; console.log("handleThemeSelection: ID =", themeId);
    const selectedTheme = allThemesData.find(theme => theme && theme.id === themeId);
    if (!selectedTheme) { console.error(`Tema ID '${themeId}' não encontrado.`); return; }
    if (selectedTheme.subThemes && Array.isArray(selectedTheme.subThemes) && selectedTheme.subThemes.length > 0) {
        showSubthemeSelectionScreen(selectedTheme, elements);
    } else if (selectedTheme.file) { loadQuizData(selectedTheme.file, elements); }
    else { console.error(`Tema '${selectedTheme.name}' inválido.`); const errorArea = elements.messageArea || elements.themeButtonsContainer; if (errorArea) showMessage(errorArea, `Config inválida para '${selectedTheme.name}'.`, 5000); }
}

/**
 * Lida com o clique em um botão de subtema.
 * @param {Event} event - O evento de clique.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function handleSubthemeSelection(event, elements) {
    const filename = event.currentTarget.dataset.file; console.log("handleSubthemeSelection: file =", filename);
    if (filename) { loadQuizData(filename, elements); }
    else { console.error("Subtema sem 'data-file'."); const errorArea = elements.messageArea || elements.subthemeButtonsContainer; if (errorArea) showMessage(errorArea, `Erro: arquivo não especificado.`, 5000); }
}

/**
 * Embaralha os elementos de um array no local (algoritmo Fisher-Yates).
 * @param {Array} array - O array a ser embaralhado.
 */
function shuffleArray(array) {
    if (!Array.isArray(array)) return;
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
}

/**
 * Mostra a seção de seleção de quantidade de questões, com botões de porcentagem.
 * @param {number} maxQuestions - O número total de questões disponíveis.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showQuestionCountSelection(maxQuestions, elements) {
    console.log("showQuestionCountSelection: Max questões =", maxQuestions);
    if (!elements.questionCountSelectionContainer) { console.error("CRITICAL: #question-count-selection não encontrado."); showThemeSelectionScreen(elements); const ea = elements.messageArea || elements.mainContainer; if(ea) showMessage(ea, "Erro: Não exibiu seleção quant.", 5000); return; }
    if (!elements.questionCountButtonsContainer) { console.error("CRITICAL: #question-count-buttons não encontrado."); }
    showOnly(elements.questionCountSelectionContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.questionCountTitleElement) elements.questionCountTitleElement.textContent = `Quantidade para '${quizConfig.theme || 'este quiz'}'?`; else { console.warn("questionCountTitleElement não encontrado"); }
    if (elements.maxQuestionsInfoElement) elements.maxQuestionsInfoElement.textContent = maxQuestions; else { console.warn("maxQuestionsInfoElement não encontrado"); }
    if (elements.questionCountMessageArea) clearMessage(elements.questionCountMessageArea, true); else { console.warn("questionCountMessageArea não encontrado"); }

    // --- Criação dos Botões de Porcentagem ---
    if (elements.questionCountButtonsContainer) {
        elements.questionCountButtonsContainer.innerHTML = ''; // Limpa
        const percentages = [0.1, 0.25, 0.5, 0.75, 1.0];
        const addedCounts = new Set();
        percentages.forEach(perc => {
            let count = (perc === 1.0) ? maxQuestions : Math.max(1, Math.round(maxQuestions * perc));
            count = Math.min(count, maxQuestions);
            if (count > 0 && (!addedCounts.has(count) || perc === 1.0)) {
                addedCounts.add(count);
                const button = document.createElement('button');
                button.className = 'control-btn count-btn';
                const percentageText = perc === 1.0 ? "Todas" : `${Math.round(perc * 100)}%`;
                button.textContent = `${percentageText} (${count} Questões)`;
                button.dataset.count = count;
                button.addEventListener('click', () => {
                    desiredQuestionCount = parseInt(button.dataset.count);
                    console.log("Número selecionado:", desiredQuestionCount);
                    if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
                    startGame(elements);
                });
                elements.questionCountButtonsContainer.appendChild(button);
            }
        });
        if (maxQuestions > 1 && !addedCounts.has(1)) {
             const button = document.createElement('button'); button.className = 'control-btn count-btn'; button.textContent = `Mínimo (1 Questão)`; button.dataset.count = 1;
             button.addEventListener('click', () => { desiredQuestionCount = 1; console.log("Número selecionado:", 1); if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide'); startGame(elements); });
             elements.questionCountButtonsContainer.prepend(button);
        }
    } // Fim if (questionCountButtonsContainer)

    // --- Botão Voltar ---
    if (elements.backToSelectionFromCountBtn) {
        const oldBackBtn = elements.backToSelectionFromCountBtn; const newBackBtn = oldBackBtn.cloneNode(true);
        if(oldBackBtn.parentNode){
            oldBackBtn.parentNode.replaceChild(newBackBtn, oldBackBtn); elements.backToSelectionFromCountBtn = newBackBtn;
            newBackBtn.addEventListener('click', () => {
                 console.log("Botão 'Voltar' clicado."); if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
                 if (currentSelectedTheme?.subThemes?.length > 0) { showSubthemeSelectionScreen(currentSelectedTheme, elements); } else { showThemeSelectionScreen(elements); }
            });
             console.log("Listener 'Voltar' adicionado.");
        } else { console.error("Pai do botão 'Voltar' não encontrado."); }
    } else { console.error("#back-to-selection-from-count-btn não encontrado."); }
}

/**
 * Inicia o quiz com as questões selecionadas.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function startGame(elements) {
    console.log("startGame: Iniciando...");
    const errorBackButton = document.getElementById('back-to-themes-btn-error'); if (errorBackButton) errorBackButton.remove();
    if (!fullQuizData?.length) { console.error("ERRO FATAL: fullQuizData vazio."); showThemeSelectionScreen(elements); const ea = elements.messageArea || elements.mainContainer; if(ea) showMessage(ea, "Erro: Dados não disponíveis.", 8000); return; }
    const maxAvailable = fullQuizData.length; if (desiredQuestionCount <= 0 || desiredQuestionCount > maxAvailable) { console.warn(`Contagem (${desiredQuestionCount}) inválida. Usando ${maxAvailable}.`); desiredQuestionCount = maxAvailable; }
    let questionsToShuffle = [...fullQuizData]; shuffleArray(questionsToShuffle); quizData = questionsToShuffle.slice(0, desiredQuestionCount);
    console.log(`Iniciando com ${quizData.length} de ${maxAvailable} questões.`);
    if (!quizData?.length) { console.error("ERRO FATAL: Nenhuma questão selecionada."); showThemeSelectionScreen(elements); const ea = elements.messageArea || elements.mainContainer; if(ea) showMessage(ea, "Erro: Nenhuma questão selecionada.", 8000); return; }
    showQuizInterface(elements); currentQuestionIndex = 0; score = 0; isAnswered = false; selectedOptionElement = null; if(elements.messageArea) clearMessage(elements.messageArea); else { console.warn("messageArea não encontrado.");}
    if(elements.quizTitleElement) elements.quizTitleElement.textContent = quizConfig.theme || "Quiz"; else { console.warn("quizTitleElement não encontrado."); }
    if(elements.resultContainer) elements.resultContainer.classList.add('hide'); else { console.warn("resultContainer não encontrado."); }
    if(elements.scoreContainer) elements.scoreContainer.classList.add('hide'); else { console.warn("scoreContainer não encontrado."); }
    if(elements.nextBtn) elements.nextBtn.classList.add('hide'); else { console.warn("nextBtn não encontrado."); }
    if(elements.finishBtn) elements.finishBtn.classList.add('hide'); else { console.warn("finishBtn não encontrado."); }
    if(elements.confirmBtn) { elements.confirmBtn.classList.remove('hide'); elements.confirmBtn.disabled = true; } else { console.error("confirmBtn não encontrado!"); }
    showQuestion(quizData[currentQuestionIndex], elements);
}

/**
 * Atualiza a barra de progresso visual e textual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function updateProgressBar(elements) {
    if (!quizData || !Array.isArray(quizData) || !elements.progressBarIndicator || !elements.progressTextElement) { return; } const totalQuestions = quizData.length; const currentQuestionNumber = currentQuestionIndex + 1; if (totalQuestions === 0) { elements.progressBarIndicator.style.width = '0%'; elements.progressTextElement.textContent = 'Questão 0 de 0'; return; } const progressPercentage = Math.min(((currentQuestionNumber) / totalQuestions) * 100, 100); elements.progressBarIndicator.style.width = `${progressPercentage}%`; elements.progressTextElement.textContent = `Questão ${currentQuestionNumber} de ${totalQuestions}`;
}

/**
 * Exibe a questão atual e suas opções embaralhadas.
 * @param {object} questionData - O objeto da questão atual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showQuestion(questionData, elements) {
    console.log(`showQuestion: Index ${currentQuestionIndex}`); isAnswered = false; selectedOptionElement = null;
    if(elements.answerOptionsElement){ const frames = elements.answerOptionsElement.querySelectorAll('.option-frame'); frames.forEach(f => f.style.outline = 'none'); }
    if(!questionData || typeof questionData.question !== 'string') { console.error("Dados da questão inválidos:", currentQuestionIndex, questionData); if(elements.messageArea) showMessage(elements.messageArea, "Erro fatal ao carregar questão.", 5000); showResults(elements); return; }
    if(elements.questionTextElement) elements.questionTextElement.innerText = questionData.question; else { console.error("questionTextElement não encontrado!"); }
    if(elements.answerOptionsElement) elements.answerOptionsElement.innerHTML = ''; else { console.error("answerOptionsElement não encontrado!"); return; } if(elements.messageArea) clearMessage(elements.messageArea);
    if (!questionData.options?.length) { console.error("Opções inválidas:", questionData); if(elements.messageArea) showMessage(elements.messageArea, "Erro: Opções não encontradas.", 5000); nextQuestion(elements); return; }
    let shuffledOptions = [...questionData.options]; shuffleArray(shuffledOptions);
    shuffledOptions.forEach((option) => { if (!option || typeof option.text !== 'string') { console.warn("Opção inválida:", option); return; } const optionFrame = document.createElement('div'); optionFrame.classList.add('option-frame'); optionFrame.dataset.optionText = option.text; const frontFace = document.createElement('div'); frontFace.className = 'front-face'; frontFace.textContent = option.text; const backFace = document.createElement('div'); backFace.className = 'back-face'; const explanationSpan = document.createElement('span'); explanationSpan.className = 'explanation'; explanationSpan.textContent = option.explanation || 'Sem explicação.'; backFace.appendChild(explanationSpan); optionFrame.appendChild(frontFace); optionFrame.appendChild(backFace); optionFrame.addEventListener('click', (event) => selectAnswer(event, elements)); if(elements.answerOptionsElement) elements.answerOptionsElement.appendChild(optionFrame); });
    if(elements.confirmBtn) { elements.confirmBtn.classList.remove('hide'); elements.confirmBtn.disabled = true; } else { console.error("confirmBtn não encontrado!"); } if(elements.nextBtn) elements.nextBtn.classList.add('hide'); else { console.warn("nextBtn não encontrado."); } if(elements.finishBtn) elements.finishBtn.classList.add('hide'); else { console.warn("finishBtn não encontrado."); } if(elements.questionContainer) elements.questionContainer.classList.remove('hide'); else { console.error("questionContainer não encontrado!"); }
    updateProgressBar(elements); // Atualiza após mostrar
}

/**
 * Lida com o clique em uma opção de resposta, marcando-a como selecionada.
 * @param {Event} event - O evento de clique.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function selectAnswer(event, elements) {
    if (isAnswered) return; if(elements.messageArea) clearMessage(elements.messageArea); const clickedFrame = event.currentTarget; if (!clickedFrame) return;
    const isAlreadySelected = clickedFrame.classList.contains('selected');
    if (elements.answerOptionsElement) { const allFrames = elements.answerOptionsElement.querySelectorAll('.option-frame'); allFrames.forEach(frame => { if (frame !== clickedFrame) { frame.classList.remove('selected'); } }); }
    clickedFrame.classList.toggle('selected');
    if (clickedFrame.classList.contains('selected')) { selectedOptionElement = clickedFrame; if(elements.confirmBtn) elements.confirmBtn.disabled = false; console.log('Opção selecionada.'); }
    else { selectedOptionElement = null; if(elements.confirmBtn) elements.confirmBtn.disabled = true; console.log('Opção desmarcada.'); }
}

/**
 * Confirma a resposta selecionada, calcula a pontuação e mostra o feedback visual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function confirmAnswer(elements) {
    console.log('confirmAnswer: Iniciando...'); if (!selectedOptionElement) { console.warn('Nenhuma opção selecionada.'); if(elements.messageArea) showMessage(elements.messageArea,"Selecione uma opção.", 3000); return; } if (isAnswered) { console.warn('Resposta já confirmada.'); return; } isAnswered = true; if(elements.confirmBtn) { elements.confirmBtn.classList.add('hide'); elements.confirmBtn.disabled = true; } if(elements.messageArea) clearMessage(elements.messageArea); try { const selectedOptionText = selectedOptionElement.dataset.optionText; if (typeof selectedOptionText === 'undefined') throw new Error("dataset.optionText ausente."); if (!quizData?.[currentQuestionIndex]?.options) throw new Error(`Dados da questão ${currentQuestionIndex} inválidos.`); const currentOriginalOptions = quizData[currentQuestionIndex].options; const correctOptionData = currentOriginalOptions.find(opt => opt?.isCorrect === true); if (!correctOptionData?.text) throw new Error(`Opção correta não definida (questão ${currentQuestionIndex}).`); const correctOptionText = correctOptionData.text; const isCorrect = (selectedOptionText === correctOptionText); if (isCorrect) { score++; console.log("CORRETA! Score:", score); } else { console.log("INCORRETA."); } const allOptionFrames = elements.answerOptionsElement ? elements.answerOptionsElement.querySelectorAll('.option-frame') : []; allOptionFrames.forEach(frame => { if (!(frame instanceof HTMLElement)) return; const frameOptionText = frame.dataset.optionText; if (typeof frameOptionText === 'undefined') { console.warn("Frame sem data-option-text:", frame); return; } const optionData = currentOriginalOptions.find(opt => opt?.text === frameOptionText); frame.classList.add('reveal', 'disabled'); if (optionData) { frame.classList.toggle('correct', optionData.isCorrect === true); frame.classList.toggle('incorrect', optionData.isCorrect !== true); } else { console.warn(`Dados não encontrados para opção: '${frameOptionText}'`); frame.classList.add('incorrect'); } if (frame === selectedOptionElement) { frame.style.outline = '3px solid #333'; frame.style.outlineOffset = '2px'; } else { frame.style.outline = 'none'; } }); updateScoreDisplay(elements); if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide'); const isLastQuestion = currentQuestionIndex >= quizData.length - 1; setTimeout(() => { if(elements.finishBtn) elements.finishBtn.classList.toggle('hide', !isLastQuestion); if(elements.nextBtn) elements.nextBtn.classList.toggle('hide', isLastQuestion); }, 800); } catch (error) { console.error("ERRO em confirmAnswer:", error); if(elements.messageArea) showMessage(elements.messageArea, `Erro: ${error.message}.`, 6000); if(elements.finishBtn) elements.finishBtn.classList.add('hide'); if(elements.nextBtn) elements.nextBtn.classList.add('hide'); }
}

/**
 * Avança para a próxima questão ou mostra os resultados se for a última.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function nextQuestion(elements) {
    console.log("nextQuestion: Avançando do índice", currentQuestionIndex); if(selectedOptionElement?.style) { selectedOptionElement.style.outline = 'none'; } currentQuestionIndex++; if (currentQuestionIndex < quizData.length) { showQuestion(quizData[currentQuestionIndex], elements); } else { showResults(elements); }
}

/**
 * Exibe a tela de resultados finais do quiz.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showResults(elements) {
    console.log("showResults: Exibindo tela final."); showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer); if(elements.questionContainer) elements.questionContainer.classList.add('hide'); else { console.warn("questionContainer não encontrado."); } if(elements.progressContainer) elements.progressContainer.classList.add('hide'); else { console.warn("progressContainer não encontrado."); } if(elements.controlsContainer) elements.controlsContainer.classList.add('hide'); else { console.warn("controlsContainer não encontrado."); } if(elements.messageArea) clearMessage(elements.messageArea); if (!elements.resultContainer) { console.error("CRITICAL: #result-container não encontrado!"); if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide'); updateScoreDisplay(elements); return; } elements.resultContainer.classList.remove('hide'); if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide'); const finalScoreDisplay = calculateFinalScoreString(); const totalQuestions = quizData.length; elements.resultContainer.innerHTML = `<h2>Quiz '${quizConfig.theme || 'Quiz'}' Finalizado!</h2><p>Você acertou <strong>${score}</strong> de <strong>${totalQuestions}</strong> perguntas.</p><p>Sua pontuação final: <strong>${finalScoreDisplay}</strong></p><button id="choose-another-theme-btn" class="control-btn back-btn" style="background-color: #007bff; color: white;">Jogar Novamente (Escolher Tema)</button>`; const chooseAnotherBtn = document.getElementById('choose-another-theme-btn'); if(chooseAnotherBtn) { chooseAnotherBtn.addEventListener('click', () => { if (elements.resultContainer) elements.resultContainer.classList.add('hide'); if (elements.scoreContainer) elements.scoreContainer.classList.add('hide'); showThemeSelectionScreen(elements); }); } else { console.error("#choose-another-theme-btn não encontrado."); } updateScoreDisplay(elements);
}

/**
 * Atualiza os elementos que exibem a pontuação atual ou final.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function updateScoreDisplay(elements) {
    console.log("updateScoreDisplay: Atualizando..."); if (!elements.scoreContainer || !elements.pointsDisplayContainer || !elements.percentageDisplayContainer || !elements.scoreValueElement || !elements.scorePercentageElement) { console.error("Elementos DOM da pontuação faltando."); return; } if (!quizConfig || typeof quizConfig.scoring === 'undefined') { console.warn("config/scoring não definido."); elements.pointsDisplayContainer.classList.add('hide'); elements.percentageDisplayContainer.classList.add('hide'); elements.scoreContainer.classList.remove('hide'); return; } const scoreString = calculateFinalScoreString(); console.log(`String de pontuação: '${scoreString}'`); if (scoreString === "Erro" || scoreString === "N/A") { console.warn("Pontuação inválida."); elements.scoreValueElement.textContent = "..."; elements.scorePercentageElement.textContent = "..."; elements.pointsDisplayContainer.classList.add('hide'); elements.percentageDisplayContainer.classList.add('hide'); elements.scoreContainer.classList.remove('hide'); return; } const isPercentage = quizConfig.scoring === "percentage"; if (isPercentage) { elements.scorePercentageElement.textContent = scoreString.replace('%', ''); elements.percentageDisplayContainer.classList.remove('hide'); elements.pointsDisplayContainer.classList.add('hide'); } else { const scoreValueOnly = scoreString.split(' ')[0]; elements.scoreValueElement.textContent = scoreValueOnly; elements.pointsDisplayContainer.classList.remove('hide'); elements.percentageDisplayContainer.classList.add('hide'); } elements.scoreContainer.classList.remove('hide'); console.log("Pontuação atualizada.");
}

/**
 * Calcula a string formatada para exibição da pontuação.
 * @returns {string} A pontuação formatada ou "N/A" ou "Erro".
 */
function calculateFinalScoreString() {
    console.log("calculateFinalScoreString: Calculando..."); if (!quizConfig || typeof quizConfig.scoring === 'undefined' || !quizData || !Array.isArray(quizData)) { console.warn("Dados insuficientes (quizData/config)."); return "N/A"; } const numQuestionsInRound = quizData.length; if (numQuestionsInRound === 0) { console.warn("0 questões."); return "0"; } if (typeof score !== 'number' || isNaN(score)) { console.error("'score' inválida:", score); return "Erro"; } let scoreDisplayString = "Erro"; try { if (quizConfig.scoring === "percentage") { const percentage = Math.round((score / numQuestionsInRound) * 100); scoreDisplayString = `${percentage}%`; } else { const totalPointsConfig = quizConfig.totalPoints; const totalOriginalQuestions = fullQuizData?.length ?? 0; let currentScoreValue; let totalString = ''; if (totalPointsConfig && typeof totalPointsConfig === 'number' && totalPointsConfig > 0 && totalOriginalQuestions > 0) { const pointsPerOriginalQuestion = totalPointsConfig / totalOriginalQuestions; currentScoreValue = Math.round(score * pointsPerOriginalQuestion); totalString = ` / ${totalPointsConfig}`; } else { currentScoreValue = score; totalString = ` / ${numQuestionsInRound}`; } const unitString = " ponto" + (currentScoreValue !== 1 ? "s" : ""); scoreDisplayString = `${currentScoreValue}${totalString}${unitString}`; } } catch (error) { console.error("Erro no cálculo:", error); scoreDisplayString = "Erro"; } console.log(`Resultado: '${scoreDisplayString}'`); return scoreDisplayString;
}

/**
 * Mostra uma mensagem temporária na área especificada.
 * @param {HTMLElement} messageAreaElement - O elemento onde mostrar a mensagem.
 * @param {string} message - O texto da mensagem.
 * @param {number} [duration=3000] - Duração em milissegundos.
 * @param {boolean} [isError=true] - Se true, aplica estilo de erro.
 * @param {boolean} [useSpecificTimeout=false] - Se true, usa a variável countMessageTimeout.
 */
function showMessage(messageAreaElement, message, duration = 3000, isError = true, useSpecificTimeout = false) {
    if (!messageAreaElement || !(messageAreaElement instanceof Element)) { console.warn("showMessage: Elemento inválido.", messageAreaElement); return; } let timeoutVar = useSpecificTimeout ? countMessageTimeout : messageTimeout; const timeoutSetter = (newTimeout) => { if (useSpecificTimeout) { countMessageTimeout = newTimeout; } else { messageTimeout = newTimeout; } }; if (timeoutVar) { clearTimeout(timeoutVar); timeoutSetter(null); } messageAreaElement.textContent = message; messageAreaElement.className = 'message-area'; messageAreaElement.classList.add(isError ? 'error' : 'success'); messageAreaElement.classList.remove('hide'); const newTimeoutId = setTimeout(() => { messageAreaElement.classList.add('hide'); messageAreaElement.textContent = ''; messageAreaElement.classList.remove('error', 'success'); timeoutSetter(null); }, duration); timeoutSetter(newTimeoutId);
}

/**
 * Limpa imediatamente qualquer mensagem na área especificada.
 * @param {HTMLElement} messageAreaElement - O elemento da mensagem.
 * @param {boolean} [useSpecificTimeout=false] - Se true, limpa o timeout específico da tela de contagem.
 */
function clearMessage(messageAreaElement, useSpecificTimeout = false) {
     if (!messageAreaElement || !(messageAreaElement instanceof Element)) return; let timeoutVar = useSpecificTimeout ? countMessageTimeout : messageTimeout; const timeoutSetter = (newTimeout) => { if (useSpecificTimeout) { countMessageTimeout = newTimeout; } else { messageTimeout = newTimeout; } }; if (timeoutVar) { clearTimeout(timeoutVar); timeoutSetter(null); } messageAreaElement.classList.add('hide'); messageAreaElement.textContent = ''; messageAreaElement.classList.remove('error', 'success');
}

// --- Inicialização DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Configurando interface...");

    // Mapeamento dos elementos do DOM
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
        questionCountButtonsContainer: document.getElementById('question-count-buttons'), // Container para botões %
        backToSelectionFromCountBtn: document.getElementById('back-to-selection-from-count-btn'),
        questionCountMessageArea: document.getElementById('question-count-message'),
        quizContainer: document.getElementById('quiz-container'),
        quizTitleElement: document.getElementById('quiz-title'),
        progressContainer: document.getElementById('progress-container'),
        progressBarIndicator: document.getElementById('progress-bar-indicator'),
        progressTextElement: document.getElementById('progress-text'),
        questionContainer: document.getElementById('question-container'),
        questionTextElement: document.getElementById('question-text'),
        answerOptionsElement: document.getElementById('answer-options'),
        messageArea: document.getElementById('message-area'), // Mensagem dentro do quiz
        controlsContainer: document.querySelector('.controls'),
        confirmBtn: document.getElementById('confirm-btn'),
        nextBtn: document.getElementById('next-btn'),
        finishBtn: document.getElementById('finish-btn'),
        scoreContainer: document.getElementById('score-container'),
        scoreValueElement: document.getElementById('score-value'),
        scorePercentageElement: document.getElementById('score-percentage'),
        pointsDisplayContainer: document.getElementById('points-score-display'),
        percentageDisplayContainer: document.getElementById('percentage-score-display'),
        resultContainer: document.getElementById('result-container')
    };

    // Verificação de elementos essenciais
    let missingElementCritical = false;
    for (const key in elements) {
        if (elements.hasOwnProperty(key) && elements[key] === null) {
            const criticalIdsForCheck = ['selectionArea', 'quizContainer', 'questionCountSelectionContainer', 'mainContainer', 'confirmBtn', 'answerOptionsElement', 'questionCountButtonsContainer'];
            let probableSelector = `#${key.replace('Element', '').replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            if (key === 'controlsContainer' || key === 'mainContainer') probableSelector = `.${key.replace('Container', '-container')}`;
            console.warn(`Elemento 'elements.${key}' (seletor: ${probableSelector}) não encontrado.`);
             if (criticalIdsForCheck.includes(key)) { console.error(`ERRO CRÍTICO: Elemento '${key}' não encontrado!`); missingElementCritical = true; }
        }
    }
    if (missingElementCritical) { document.body.innerHTML = '<p style="color:red;text-align:center;padding:30px;">Erro: Elementos HTML essenciais não encontrados.</p>'; return; }
    else { console.log("Verificação de elementos OK."); }

    // Aplica estado inicial de visibilidade
    console.log("Aplicando visibilidade inicial...");
    if(elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
    if(elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
    if(elements.quizContainer) elements.quizContainer.classList.add('hide');
    if(elements.selectionArea) elements.selectionArea.classList.remove('hide');
    if(elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');

    // Configuração dos Listeners Estáticos
    if (elements.backToThemesBtn) elements.backToThemesBtn.addEventListener('click', () => { if(elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide'); if(elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide'); currentSelectedTheme = null; }); else console.warn("#back-to-themes-btn não encontrado.");
    if (elements.confirmBtn) elements.confirmBtn.addEventListener('click', () => confirmAnswer(elements)); else console.error("#confirm-btn não encontrado!");
    if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => nextQuestion(elements)); else console.warn("#next-btn não encontrado.");
    if (elements.finishBtn) elements.finishBtn.addEventListener('click', () => showResults(elements)); else console.warn("#finish-btn não encontrado.");

    // Inicia a aplicação mostrando a tela de seleção de temas
    console.log("Iniciando aplicação...");
    showThemeSelectionScreen(elements); // Chama a função que carrega temas e mostra a tela

    // Log final
    const now = new Date(); let options = { hour12: false, timeZone: 'America/Sao_Paulo' }; try { options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { console.warn("Timezone não detectado."); }
    console.log(`Interface JS pronta: ${now.toLocaleString('pt-BR', options)} (${options.timeZone})`);
});