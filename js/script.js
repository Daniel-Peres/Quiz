// --- Variáveis Globais ---
let allThemesData = [];
let currentSelectedTheme = null;
let quizData = [];
let quizConfig = {};

// --- Variáveis de Estado ---
let currentQuestionIndex;
let score;
let selectedOptionElement = null;
let isAnswered = false;
let messageTimeout = null;

// --- Funções ---

function showOnly(elementToShow, selectionArea, quizContainer) {
    if (selectionArea) selectionArea.classList.add('hide');
    if (quizContainer) quizContainer.classList.add('hide');
    if (elementToShow) elementToShow.classList.remove('hide');
}

function showThemeSelectionScreen(elements) {
    console.log("showThemeSelectionScreen");
    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer);
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');
    if (elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
    if (elements.themeButtonsContainer) elements.themeButtonsContainer.innerHTML = '<p>Carregando temas...</p>';
    loadThemes(elements);
}

function showSubthemeSelectionScreen(theme, elements) {
    currentSelectedTheme = theme;
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.add('hide');
    if (elements.subthemeTitleElement) elements.subthemeTitleElement.textContent = `Escolha um Subtema para: ${theme.name}`;
    populateSubthemeButtons(theme.subThemes, elements);
    if (elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.remove('hide');
}

function showQuizInterface(elements) {
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer);
    if (elements.progressBarIndicator) elements.progressBarIndicator.style.width = '0%';
    if (elements.progressTextElement) elements.progressTextElement.textContent = 'Carregando...';
}

async function loadThemes(elements) {
    console.log('loadThemes: Iniciando busca...');
    try {
        // <<< CAMINHO ATUALIZADO >>>
        const response = await fetch('data/themes.json');
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        allThemesData = await response.json();
        if (!Array.isArray(allThemesData)) throw new Error("Formato inválido");
        console.log('loadThemes: Dados parseados:', allThemesData);
        populateThemeButtons(allThemesData, elements);
    } catch (error) {
        console.error("Falha ao carregar themes.json:", error);
        if (elements.themeButtonsContainer) elements.themeButtonsContainer.innerHTML = `<p style="color: red;">Erro ao carregar temas.</p>`;
    }
}

function populateThemeButtons(themes, elements) {
    console.log('populateThemeButtons');
    if (!elements.themeButtonsContainer) return;
    elements.themeButtonsContainer.innerHTML = '';
    if (!themes || themes.length === 0) { /*...*/ return; }
    themes.forEach(theme => {
        if (!theme.id) { /*...*/ return; }
        const button = document.createElement('button');
        button.className = 'theme-btn';
        button.dataset.themeId = theme.id;
        let buttonHTML = `<strong>${theme.name || 'Sem Nome'}</strong>`;
        if (theme.description) buttonHTML += `<span class="description">${theme.description}</span>`;
        button.innerHTML = buttonHTML;
        button.addEventListener('click', (event) => handleThemeSelection(event, elements));
        elements.themeButtonsContainer.appendChild(button);
    });
}

function populateSubthemeButtons(subThemes, elements) {
     console.log('populateSubthemeButtons');
     if (!elements.subthemeButtonsContainer) return;
    elements.subthemeButtonsContainer.innerHTML = '';
     if (!subThemes || !Array.isArray(subThemes) || subThemes.length === 0) { /*...*/ return; }
    subThemes.forEach(subTheme => {
         if(!subTheme.file) { /*...*/ return; }
        const button = document.createElement('button');
        button.className = 'theme-btn';
        button.dataset.file = subTheme.file;
        let buttonHTML = `<strong>${subTheme.name || 'Sem Nome'}</strong>`;
        if (subTheme.description) buttonHTML += `<span class="description">${subTheme.description}</span>`;
        button.innerHTML = buttonHTML;
        button.addEventListener('click', (event) => handleSubthemeSelection(event, elements));
        elements.subthemeButtonsContainer.appendChild(button);
    });
}

async function loadQuizData(filename, elements) {
    console.log(`Carregando quiz: ${filename}`);
    if(elements.quizTitleElement) elements.quizTitleElement.textContent = "Carregando Quiz...";
    showQuizInterface(elements);
    if(elements.questionContainer) elements.questionContainer.classList.add('hide');
    if(elements.controlsContainer) elements.controlsContainer.classList.add('hide');
    if(elements.progressContainer) elements.progressContainer.classList.add('hide');

    const errorBackButton = document.getElementById('back-to-themes-btn-error');
    if (errorBackButton) errorBackButton.remove();

    try {
        // <<< CAMINHO ATUALIZADO >>>
        const response = await fetch(`data/${filename}`);
        if (!response.ok) { /*...*/ throw new Error(/*...*/); }
        const jsonData = await response.json();
        if (!jsonData || !jsonData.data || !jsonData.config) throw new Error(/*...*/);
        if (!Array.isArray(jsonData.data) || jsonData.data.length === 0) throw new Error(/*...*/);

        quizData = jsonData.data;
        quizConfig = jsonData.config;
        console.log(`Quiz '${quizConfig.theme}' carregado.`);
        startGame(elements);

    } catch (error) {
        console.error("Falha ao carregar dados do quiz:", filename, error);
         if(elements.quizTitleElement) elements.quizTitleElement.textContent = "Erro ao Carregar";
         showMessage(elements.messageArea, `Não foi possível carregar '${filename}'. ${error.message}`);
         // Esconde elementos do quiz
         if(elements.progressContainer) elements.progressContainer.classList.add('hide');
         if(elements.questionContainer) elements.questionContainer.classList.add('hide');
         if(elements.controlsContainer) elements.controlsContainer.classList.add('hide');
         if(elements.scoreContainer) elements.scoreContainer.classList.add('hide');
         // Adiciona botão voltar
         if (elements.quizContainer && !document.getElementById('back-to-themes-btn-error')) {
            const backButton = document.createElement('button');
            backButton.textContent = 'Voltar à Seleção';
            backButton.id = 'back-to-themes-btn-error';
            backButton.className = 'control-btn back-btn'; // Usa classes customizadas
            backButton.style.marginTop = '20px';
            backButton.onclick = () => showThemeSelectionScreen(elements);
            elements.quizContainer.appendChild(backButton);
         }
    }
}

function handleThemeSelection(event, elements) {
    const themeId = event.currentTarget.dataset.themeId;
    const selectedTheme = allThemesData.find(theme => theme.id === themeId);
    if (!selectedTheme) return;
    if (selectedTheme.subThemes && Array.isArray(selectedTheme.subThemes) && selectedTheme.subThemes.length > 0) {
        showSubthemeSelectionScreen(selectedTheme, elements);
    } else if (selectedTheme.file) {
        loadQuizData(selectedTheme.file, elements);
    } else { console.error(`Tema ${themeId} inválido.`); }
}

function handleSubthemeSelection(event, elements) {
    const filename = event.currentTarget.dataset.file;
    if (filename) loadQuizData(filename, elements);
    else console.error("Subtema sem data-file.");
}

function updateProgressBar(elements) {
    if (!quizData || !Array.isArray(quizData) || quizData.length === 0 || !elements.progressBarIndicator || !elements.progressTextElement) return;
    const totalQuestions = quizData.length;
    const currentQuestionNumber = currentQuestionIndex + 1;
    const progressPercentage = totalQuestions > 0 ? Math.min((currentQuestionNumber / totalQuestions) * 100, 100) : 0;
    elements.progressBarIndicator.style.width = `${progressPercentage}%`; // Atualiza barra customizada
    elements.progressTextElement.textContent = `Questão ${currentQuestionNumber} de ${totalQuestions}`;
}


function startGame(elements) {
    const errorBackButton = document.getElementById('back-to-themes-btn-error');
    if (errorBackButton) errorBackButton.remove();
    showQuizInterface(elements);

    currentQuestionIndex = 0;
    score = 0;
    isAnswered = false;
    selectedOptionElement = null;
    clearMessage(elements.messageArea);
    if(elements.quizTitleElement) elements.quizTitleElement.textContent = quizConfig.theme || "Quiz";

    if(elements.progressContainer) elements.progressContainer.classList.remove('hide');
    if(elements.questionContainer) elements.questionContainer.classList.remove('hide');
    if(elements.controlsContainer) elements.controlsContainer.classList.remove('hide');
    if(elements.resultContainer) elements.resultContainer.classList.add('hide');
    if(elements.scoreContainer) elements.scoreContainer.classList.add('hide');
    if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    if(elements.finishBtn) elements.finishBtn.classList.add('hide');
    if(elements.confirmBtn) {
        elements.confirmBtn.classList.remove('hide');
        elements.confirmBtn.disabled = true;
    }
    showQuestion(quizData[currentQuestionIndex], elements);
}

function showQuestion(questionData, elements) {
    isAnswered = false;
    selectedOptionElement = null;
    if(!questionData || typeof questionData.question === 'undefined') { /*...*/ return; }
    if(elements.questionTextElement) elements.questionTextElement.innerText = questionData.question;
    if(elements.answerOptionsElement) elements.answerOptionsElement.innerHTML = '';
    clearMessage(elements.messageArea);
    updateProgressBar(elements);

    if (!questionData.options || !Array.isArray(questionData.options)) { /*...*/ return; }

    questionData.options.forEach((option, index) => {
        const optionFrame = document.createElement('div');
        optionFrame.classList.add('option-frame'); // Usa classe customizada original
        optionFrame.dataset.index = index;
        const frontFace = document.createElement('div'); frontFace.className = 'front-face'; frontFace.textContent = option.text || '';
        const backFace = document.createElement('div'); backFace.className = 'back-face';
        const explanationSpan = document.createElement('span'); explanationSpan.className = 'explanation';
        explanationSpan.textContent = option.explanation || 'Sem explicação.';
        backFace.appendChild(explanationSpan);
        optionFrame.appendChild(frontFace); optionFrame.appendChild(backFace);
        optionFrame.addEventListener('click', (event) => selectAnswer(event, elements));
        // Adiciona diretamente ao container de opções (que é .options-grid no CSS)
        if(elements.answerOptionsElement) elements.answerOptionsElement.appendChild(optionFrame);
    });

    if(elements.confirmBtn) {
        elements.confirmBtn.classList.remove('hide');
        elements.confirmBtn.disabled = true;
    }
    if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    if(elements.finishBtn) elements.finishBtn.classList.add('hide');
    if(elements.questionContainer) elements.questionContainer.classList.remove('hide');
}


function selectAnswer(event, elements) {
    if (isAnswered) return;
    clearMessage(elements.messageArea);
    const clickedFrame = event.currentTarget;

    if (selectedOptionElement) selectedOptionElement.classList.remove('selected');
    clickedFrame.classList.add('selected');
    selectedOptionElement = clickedFrame;

    if(elements.confirmBtn) elements.confirmBtn.disabled = false;
    console.log('Botão Confirmar HABILITADO.');
}

function confirmAnswer(elements) {
    console.log('confirmAnswer INICIADA!');
    if (!selectedOptionElement) { showMessage(elements.messageArea,"Selecione uma opção."); return; }
    if (isAnswered) { console.warn('confirmAnswer: Resposta já dada.'); return; }

    isAnswered = true;
    if(elements.confirmBtn) {
        elements.confirmBtn.classList.add('hide');
        elements.confirmBtn.disabled = true;
    }
    clearMessage(elements.messageArea);

    try {
        const selectedIndex = parseInt(selectedOptionElement.dataset.index);
        if (!quizData || !Array.isArray(quizData) || !quizData[currentQuestionIndex] || !quizData[currentQuestionIndex].options || !Array.isArray(quizData[currentQuestionIndex].options)) throw new Error(`Dados questão ${currentQuestionIndex} inválidos.`);
        const currentOptions = quizData[currentQuestionIndex].options;
        const correctOption = currentOptions.find(opt => opt.isCorrect === true);
        if (typeof correctOption === 'undefined') throw new Error(`Opção correta (isCorrect:true) não definida questão ${currentQuestionIndex}.`);
        const correctIndex = currentOptions.indexOf(correctOption);
        const isCorrect = selectedIndex === correctIndex;
        if (isCorrect) score++;

        const allOptionFrames = elements.answerOptionsElement ? elements.answerOptionsElement.querySelectorAll('.option-frame') : [];
        allOptionFrames.forEach((frame, index) => {
            if (!(frame instanceof HTMLElement)) return;
            frame.classList.add('reveal', 'disabled');
            const optionData = currentOptions[index];
            if(!optionData) return;
            if(optionData.isCorrect === true) {
                frame.classList.add('correct'); frame.classList.remove('incorrect');
            } else {
                frame.classList.add('incorrect'); frame.classList.remove('correct');
            }
            // Log das classes aqui pode ser útil se o problema persistir
             console.log(`confirmAnswer: Frame ${index} classes: ${frame.className}`);
        });

        updateScoreDisplay(elements);
        if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide');

        const isLastQuestion = currentQuestionIndex >= quizData.length - 1;
        setTimeout(() => {
            if(elements.finishBtn) elements.finishBtn.classList.toggle('hide', !isLastQuestion);
            if(elements.nextBtn) elements.nextBtn.classList.toggle('hide', isLastQuestion);
        }, 800);

    } catch (error) {
        console.error("ERRO DENTRO DE confirmAnswer:", error);
        showMessage(elements.messageArea, `Erro ao processar resposta: ${error.message}`, 5000);
        if(elements.finishBtn) elements.finishBtn.classList.add('hide');
        if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    }
}

function nextQuestion(elements) {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) showQuestion(quizData[currentQuestionIndex], elements);
    else showResults(elements);
}

function showResults(elements) {
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer);
    if(elements.questionContainer) elements.questionContainer.classList.add('hide');
    if(elements.progressContainer) elements.progressContainer.classList.add('hide');
    if(elements.controlsContainer) elements.controlsContainer.classList.add('hide');
    clearMessage(elements.messageArea);

    if(elements.resultContainer) elements.resultContainer.classList.remove('hide');
    if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide');

    const finalScoreDisplay = calculateFinalScoreString();
    if(elements.resultContainer) {
        elements.resultContainer.innerHTML = `
            <h2>Quiz '${quizConfig.theme}' Finalizado!</h2>
            <p>Você acertou ${score} de ${quizData.length} perguntas.</p>
            <p>Pontuação Final: ${finalScoreDisplay}</p>
            <button id="choose-another-theme-btn" class="control-btn back-btn">Escolher Outro Tema</button> `;
        const chooseAnotherBtn = document.getElementById('choose-another-theme-btn');
        if(chooseAnotherBtn) {
            chooseAnotherBtn.addEventListener('click', () => showThemeSelectionScreen(elements));
        }
    }
}


function updateScoreDisplay(elements) {
    console.log("updateScoreDisplay: Iniciando atualização.");
    if (!quizConfig || typeof quizConfig.scoring === 'undefined' || !elements.pointsDisplayContainer || !elements.percentageDisplayContainer || !elements.scoreValueElement || !elements.scorePercentageElement || !elements.scoreContainer) {
        console.warn("updateScoreDisplay: Configuração ou elementos DOM da pontuação não prontos/passados. Abortando.");
        return;
    }
    const scoreString = calculateFinalScoreString();
    console.log(`updateScoreDisplay: scoreString recebida: '${scoreString}' (Tipo: ${typeof scoreString})`);
    if (typeof scoreString !== 'string') {
         console.error("updateScoreDisplay: calculateFinalScoreString não retornou string válida! Recebido:", scoreString);
         elements.scoreValueElement.textContent = "Erro";
         elements.scorePercentageElement.textContent = "Erro";
         if(elements.scoreContainer.classList.contains('hide')) elements.scoreContainer.classList.remove('hide');
         elements.pointsDisplayContainer.classList.add('hide');
         elements.percentageDisplayContainer.classList.add('hide');
         return;
    }
    const isPercentage = quizConfig.scoring === "percentage";
    console.log(`updateScoreDisplay: Modo percentage? ${isPercentage}`);
    if (isPercentage) {
        console.log("updateScoreDisplay: Modo Percentage.");
        if(elements.scorePercentageElement) {
             if (scoreString && typeof scoreString.replace === 'function') {
                 elements.scorePercentageElement.textContent = scoreString.replace('%', '');
                 console.log(`updateScoreDisplay: scorePercentageElement.textContent = ${elements.scorePercentageElement.textContent}`);
             } else {
                 console.warn("updateScoreDisplay: scoreString inválida para replace:", scoreString);
                 elements.scorePercentageElement.textContent = "N/A";
             }
        } else { console.warn("updateScoreDisplay: scorePercentageElement não encontrado."); }
        if(elements.percentageDisplayContainer) elements.percentageDisplayContainer.classList.remove('hide');
        if(elements.pointsDisplayContainer) elements.pointsDisplayContainer.classList.add('hide');
        console.log("updateScoreDisplay: Visibilidade ajustada para Percentage.");
    } else { // Modo Pontos
        console.log("updateScoreDisplay: Modo Pontos.");
        if(elements.scoreValueElement) {
             elements.scoreValueElement.textContent = scoreString.split(' ')[0];
             console.log(`updateScoreDisplay: scoreValueElement.textContent = ${elements.scoreValueElement.textContent}`);
        } else { console.warn("updateScoreDisplay: scoreValueElement não encontrado."); }
        if(elements.pointsDisplayContainer) elements.pointsDisplayContainer.classList.remove('hide');
        if(elements.percentageDisplayContainer) elements.percentageDisplayContainer.classList.add('hide');
         console.log("updateScoreDisplay: Visibilidade ajustada para Pontos.");
    }
    if(elements.scoreContainer && elements.scoreContainer.classList.contains('hide')){
       elements.scoreContainer.classList.remove('hide');
       console.log("updateScoreDisplay: scoreContainer tornado visível.");
    }
     console.log("updateScoreDisplay: Atualização concluída.");
}

function calculateFinalScoreString() {
    console.log("calculateFinalScoreString: Iniciando cálculo.");
    if (!quizConfig || typeof quizConfig.scoring === 'undefined' || !quizData || !Array.isArray(quizData) || !quizData.length ) {
        console.warn("calculateFinalScoreString: Dados insuficientes. Retornando 'N/A'.");
        return "N/A";
    }
    console.log(`calculateFinalScoreString: score=${score}, length=${quizData.length}, scoring=${quizConfig.scoring}, totalPoints=${quizConfig.totalPoints}`);
    let scoreDisplayString = "Erro";
    try {
        if (quizConfig.scoring === "percentage") {
            console.log("calculateFinalScoreString: Calculando percentual...");
            const percentage = quizData.length > 0 ? Math.round((score / quizData.length) * 100) : 0;
            scoreDisplayString = `${percentage}%`;
            console.log(`calculateFinalScoreString: Percentual: ${scoreDisplayString}`);
        } else { // Modo Pontos
            console.log("calculateFinalScoreString: Calculando pontos...");
            const totalPossibleScore = quizConfig.totalPoints;
            const pointsPerQuestion = (totalPossibleScore && typeof totalPossibleScore === 'number' && totalPossibleScore > 0 && quizData.length > 0) ? totalPossibleScore / quizData.length : 1;
            const currentScoreValue = Math.round(score * pointsPerQuestion);
            const totalString = (totalPossibleScore && typeof totalPossibleScore === 'number' && totalPossibleScore > 0) ? ` / ${totalPossibleScore}` : '';
            const unitString = " ponto" + (currentScoreValue !== 1 ? "s" : "");
            scoreDisplayString = `${currentScoreValue}${totalString}${unitString}`;
            console.log(`calculateFinalScoreString: Pontos: ${scoreDisplayString}`);
        }
    } catch (error) {
        console.error("Erro dentro de calculateFinalScoreString:", error);
        scoreDisplayString = "Erro";
    }
    console.log(`calculateFinalScoreString: Retornando: '${scoreDisplayString}'`);
    return scoreDisplayString;
}


function showMessage(messageAreaElement, message, duration = 3000, isError = true) {
    if (!messageAreaElement) { console.warn("showMessage: messageAreaElement não fornecido."); return; }
    if (messageTimeout) clearTimeout(messageTimeout);
    messageAreaElement.textContent = message;
    messageAreaElement.classList.toggle('success', !isError);
    messageAreaElement.classList.remove('hide');
    messageTimeout = setTimeout(() => { messageAreaElement.classList.add('hide'); messageTimeout = null; }, duration);
}
function clearMessage(messageAreaElement) {
    if (!messageAreaElement) return;
     if (messageTimeout) clearTimeout(messageTimeout);
    messageAreaElement.classList.add('hide');
    messageAreaElement.textContent = '';
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Evento disparado.");
    const elements = {
        mainContainer: document.querySelector('.main-container'),
        selectionArea: document.getElementById('selection-area'),
        themeSelectionContainer: document.getElementById('theme-selection-container'),
        themeButtonsContainer: document.getElementById('theme-buttons'),
        subthemeSelectionContainer: document.getElementById('subtheme-selection-container'),
        subthemeTitleElement: document.getElementById('subtheme-title'),
        subthemeButtonsContainer: document.getElementById('subtheme-buttons'),
        backToThemesBtn: document.getElementById('back-to-themes-btn'),
        quizContainer: document.getElementById('quiz-container'),
        quizTitleElement: document.getElementById('quiz-title'),
        progressContainer: document.getElementById('progress-container'),
        progressBarIndicator: document.getElementById('progress-bar-indicator'),
        progressTextElement: document.getElementById('progress-text'),
        questionContainer: document.getElementById('question-container'),
        questionTextElement: document.getElementById('question-text'),
        answerOptionsElement: document.getElementById('answer-options'), // Este é o .options-grid aqui
        controlsContainer: document.querySelector('.controls'),
        confirmBtn: document.getElementById('confirm-btn'),
        nextBtn: document.getElementById('next-btn'),
        finishBtn: document.getElementById('finish-btn'),
        scoreContainer: document.getElementById('score-container'),
        scoreValueElement: document.getElementById('score-value'),
        scorePercentageElement: document.getElementById('score-percentage'),
        pointsDisplayContainer: document.getElementById('points-score-display'),
        percentageDisplayContainer: document.getElementById('percentage-score-display'),
        resultContainer: document.getElementById('result-container'),
        messageArea: document.getElementById('message-area')
    };

    const essentialIds = ['selection-area', 'quiz-container', 'confirm-btn', 'back-to-themes-btn', 'theme-buttons', 'subtheme-selection-container', 'answer-options'];
    let missingElement = false;
    essentialIds.forEach(id => {
        const key = Object.keys(elements).find(k => elements[k]?.id === id);
        if (!key || !elements[key]) {
             console.error(`ERRO CRÍTICO: Elemento essencial com ID '${id}' não encontrado!`);
             missingElement = true;
        }
    });
    if (missingElement) { /*...*/ return; }

    elements.backToThemesBtn.addEventListener('click', () => {
        console.log("Botão 'Voltar aos Temas' clicado.");
        if(elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
        if(elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');
    });
    elements.confirmBtn.addEventListener('click', () => { console.log('EVENTO: Confirmar clicado!'); confirmAnswer(elements); });
    elements.nextBtn.addEventListener('click', () => nextQuestion(elements));
    elements.finishBtn.addEventListener('click', () => showResults(elements));

    showThemeSelectionScreen(elements);
    const now = new Date();
    let options = { hour12: false };
    try { options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { options.timeZone = 'America/Sao_Paulo'; }
    console.log(`Interface pronta: ${now.toLocaleString('pt-BR', options)} (${options.timeZone})`);
});