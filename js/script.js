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
 * @param {HTMLElement | null} selectionArea - Container da seleção de tema/subtema.
 * @param {HTMLElement | null} quizContainer - Container principal do quiz.
 * @param {HTMLElement | null} questionCountSelection - Container da seleção de quantidade.
 */
function showOnly(elementToShow, selectionArea, quizContainer, questionCountSelection) {
    // console.log("showOnly called. Showing:", elementToShow ? elementToShow.id : 'null');
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
    console.log("--- showThemeSelectionScreen INICIADA ---");
    currentSelectedTheme = null; // Limpa tema pai ao voltar aqui
    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');
    if (elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
    if (elements.themeButtonsContainer) {
        elements.themeButtonsContainer.innerHTML = '<p>Carregando temas...</p>';
        loadThemes(elements);
    } else { console.error("Elemento themeButtonsContainer não encontrado!"); }
}

/**
 * Mostra a tela de seleção de subtemas para um tema específico. (CORRIGIDA)
 * @param {object} theme - O objeto do tema pai selecionado.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showSubthemeSelectionScreen(theme, elements) {
    console.log("--- showSubthemeSelectionScreen INICIADA ---", "Tema:", theme?.name);
    currentSelectedTheme = theme; // Guarda tema pai

    // <<< CORREÇÃO: Usa showOnly para garantir que só a área de seleção esteja visível >>>
    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);

    // Dentro da área de seleção, esconde temas e mostra subtemas
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.add('hide');
    if (elements.subthemeSelectionContainer) {
         // <<< LOG ANTES DE MOSTRAR >>>
         console.log("showSubthemeSelectionScreen: Tentando remover 'hide' de subthemeSelectionContainer...");
         console.log("showSubthemeSelectionScreen: Elemento é:", elements.subthemeSelectionContainer); // Verifica se o elemento é válido
        elements.subthemeSelectionContainer.classList.remove('hide'); // Mostra container de subtemas
         // <<< LOG DEPOIS DE MOSTRAR >>>
         console.log("showSubthemeSelectionScreen: 'hide' REMOVIDO de subthemeSelectionContainer.");
         try { // Adicionado try-catch para getComputedStyle
            console.log("showSubthemeSelectionScreen: Visibilidade atual:", window.getComputedStyle(elements.subthemeSelectionContainer).display);
         } catch (e) {
            console.warn("Não foi possível obter o estilo computado de subthemeSelectionContainer", e);
         }
    } else { console.error("subthemeSelectionContainer não encontrado!"); return; } // Crítico

    // Define o título
    if (elements.subthemeTitleElement) elements.subthemeTitleElement.textContent = `Escolha um Subtema para: ${theme.name}`;
    else { console.warn("subthemeTitleElement não encontrado"); }

    // Preenche os botões de subtema
    populateSubthemeButtons(theme.subThemes, elements);

    console.log("--- showSubthemeSelectionScreen FINALIZADA ---");
}


/**
 * Mostra a interface principal do quiz (barra, pergunta, opções, controles).
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showQuizInterface(elements) {
    console.log("showQuizInterface");
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.progressBarIndicator) elements.progressBarIndicator.style.width = '0%'; else { console.warn("progressBarIndicator não encontrado"); }
    if (elements.progressTextElement) elements.progressTextElement.textContent = 'Carregando...'; else { console.warn("progressTextElement não encontrado"); }
    if (elements.progressContainer) elements.progressContainer.classList.remove('hide'); else { console.warn("progressContainer não encontrado"); }
    if (elements.questionContainer) elements.questionContainer.classList.remove('hide'); else { console.warn("questionContainer não encontrado"); }
    if (elements.controlsContainer) elements.controlsContainer.classList.remove('hide'); else { console.warn("controlsContainer não encontrado"); }
}

/**
 * Carrega a lista de temas do arquivo JSON principal.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
async function loadThemes(elements) {
    console.log('loadThemes: Iniciando busca...');
    const themesPath = 'data/themes.json'; // Caminho relativo à pasta 'data'
    try {
        const response = await fetch(themesPath);
        if (!response.ok) throw new Error(`Erro HTTP ${response.status} ao buscar ${themesPath}`);
        allThemesData = await response.json();
        if (!Array.isArray(allThemesData)) throw new Error("Formato inválido de themes.json.");
        console.log('loadThemes: Dados parseados:', allThemesData);
        populateThemeButtons(allThemesData, elements);
    } catch (error) {
        console.error("Falha CRÍTICA ao carregar themes.json:", error);
        if (elements.themeButtonsContainer) elements.themeButtonsContainer.innerHTML = `<p style="color: red;">Erro ao carregar temas: ${error.message}. Verifique o console (F12).</p>`;
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
    elements.themeButtonsContainer.innerHTML = '';
    if (!themes?.length) { elements.themeButtonsContainer.innerHTML = '<p>Nenhum tema encontrado.</p>'; return; }
    themes.forEach(theme => {
        if (!theme?.id || !theme.name) { console.warn("Tema inválido:", theme); return; }
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
     elements.subthemeButtonsContainer.innerHTML = '';
     if (!subThemes?.length) { elements.subthemeButtonsContainer.innerHTML = '<p>Nenhum subtema encontrado.</p>'; return; }
     subThemes.forEach(subTheme => {
         if(!subTheme?.file || !subTheme.name) { console.warn("Subtema inválido:", subTheme); return; }
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
    if (!loadingMsgElement && elements.mainContainer) { /* ...cria msg loading ... */ } else if (loadingMsgElement) { /* ... reutiliza msg loading ... */ }
    const errorBackButton = document.getElementById('back-to-themes-btn-error'); if (errorBackButton) errorBackButton.remove();
    const quizPath = `data/${filename}`; // Caminho relativo à pasta 'data'
    try {
        console.log(`Buscando arquivo em: ${quizPath}`);
        const response = await fetch(quizPath);
        if (!response.ok) throw new Error(`Falha ao buscar '${filename}' (Status: ${response.status})`);
        const jsonData = await response.json();
        if (!jsonData || typeof jsonData !== 'object') throw new Error("JSON vazio/inválido.");
        if (!jsonData.config || typeof jsonData.config !== 'object') throw new Error("Config ('config') ausente/inválida.");
        if (!jsonData.data || !Array.isArray(jsonData.data)) throw new Error("Dados ('data') ausentes/inválidos.");
        if (jsonData.data.length === 0) throw new Error("Arquivo não contém questões ('data' vazio).");
        fullQuizData = jsonData.data; quizConfig = jsonData.config;
        console.log(`Quiz '${quizConfig.theme || 'Sem Título'}' pré-carregado com ${fullQuizData.length} questões.`);
        if (loadingMsgElement) loadingMsgElement.classList.add('hide');
        showQuestionCountSelection(fullQuizData.length, elements); // Chama seleção de quantidade
    } catch (error) {
        console.error("Falha CRÍTICA ao carregar quiz:", filename, error);
        if (loadingMsgElement) { /* ... mostra erro ... */ } else if (elements.mainContainer) { /* ... mostra erro ... */ }
        if (loadingMsgElement && !document.getElementById('back-to-themes-btn-error')) { /* ... adiciona botão voltar ... */ }
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
    if (selectedTheme.subThemes?.length > 0) { showSubthemeSelectionScreen(selectedTheme, elements); }
    else if (selectedTheme.file) { loadQuizData(selectedTheme.file, elements); }
    else { console.error(`Tema '${selectedTheme.name}' inválido.`); const ea = elements.messageArea || elements.themeButtonsContainer; if (ea) showMessage(ea, `Config inválida para '${selectedTheme.name}'.`, 5000); }
}

/**
 * Lida com o clique em um botão de subtema.
 * @param {Event} event - O evento de clique.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function handleSubthemeSelection(event, elements) {
    const filename = event.currentTarget.dataset.file; console.log("handleSubthemeSelection: file =", filename);
    if (filename) { loadQuizData(filename, elements); }
    else { console.error("Subtema sem 'data-file'."); const ea = elements.messageArea || elements.subthemeButtonsContainer; if (ea) showMessage(ea, `Erro: arquivo não especificado.`, 5000); }
}

/**
 * Embaralha os elementos de um array no local (algoritmo Fisher-Yates).
 * @param {Array} array - O array a ser embaralhado.
 */
function shuffleArray(array) { if(!Array.isArray(array))return; for(let i=array.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]];} }

/**
 * Mostra a seção de seleção de quantidade de questões, com botões de porcentagem (25%, 50%, 75%, 100%).
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

    // --- Criação dos Botões de Porcentagem (25%, 50%, 75%, 100%) ---
    if (elements.questionCountButtonsContainer) {
        elements.questionCountButtonsContainer.innerHTML = ''; // Limpa
        const percentages = [0.25, 0.5, 0.75, 1.0]; // Percentuais
        const addedCounts = new Set();
        percentages.forEach(perc => {
            let count = (perc === 1.0) ? maxQuestions : Math.max(1, Math.round(maxQuestions * perc));
            count = Math.min(count, maxQuestions);
            if (count > 0 && (!addedCounts.has(count) || perc === 1.0)) {
                addedCounts.add(count);
                const button = document.createElement('button'); button.className = 'control-btn count-btn';
                const percentageText = perc === 1.0 ? "Todas" : `${Math.round(perc * 100)}%`;
                button.textContent = `${percentageText} (${count} Questões)`; button.dataset.count = count;
                button.addEventListener('click', () => {
                    desiredQuestionCount = parseInt(button.dataset.count); console.log("Número selecionado:", desiredQuestionCount);
                    if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
                    startGame(elements);
                });
                elements.questionCountButtonsContainer.appendChild(button);
            }
        });
    } // Fim if (questionCountButtonsContainer)

    // --- Botão Voltar (Listener re-adicionado via cloneNode) ---
    if (elements.backToSelectionFromCountBtn) {
        const oldBackBtn = elements.backToSelectionFromCountBtn; const newBackBtn = oldBackBtn.cloneNode(true);
        if(oldBackBtn.parentNode){
            oldBackBtn.parentNode.replaceChild(newBackBtn, oldBackBtn); elements.backToSelectionFromCountBtn = newBackBtn;
            newBackBtn.addEventListener('click', () => {
                 console.log(">>> Botão 'Voltar' (da contagem) CLICADO!"); console.log("currentSelectedTheme:", currentSelectedTheme);
                 if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
                 if (currentSelectedTheme?.subThemes?.length > 0) { console.log("<<< Voltando para SUBTEMAS."); showSubthemeSelectionScreen(currentSelectedTheme, elements); } // Chama a função corrigida
                 else { console.log("<<< Voltando para TEMAS."); showThemeSelectionScreen(elements); }
            });
             console.log("Listener 'Voltar' (contagem) RE-ADICIONADO.");
        } else { console.error("Pai do #back-to-selection-from-count-btn não encontrado."); }
    } else { console.error("#back-to-selection-from-count-btn não encontrado."); }
}

/**
 * Inicia o quiz com as questões selecionadas.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function startGame(elements) {
    console.log("startGame: Iniciando..."); const eb=document.getElementById('back-to-themes-btn-error'); if(eb) eb.remove(); if(!fullQuizData?.length){console.error("ERRO: start sem fullQuizData.");showThemeSelectionScreen(elements);return;} const max=fullQuizData.length; if(desiredQuestionCount<=0||desiredQuestionCount>max)desiredQuestionCount=max; let qs=[...fullQuizData]; shuffleArray(qs); quizData=qs.slice(0,desiredQuestionCount); if(!quizData?.length){console.error("ERRO: quizData vazio.");showThemeSelectionScreen(elements);return;} console.log(`Iniciando com ${quizData.length} de ${max}.`); showQuizInterface(elements); currentQuestionIndex=0; score=0; isAnswered=false; selectedOptionElement=null; if(elements.messageArea)clearMessage(elements.messageArea); if(elements.quizTitleElement)elements.quizTitleElement.textContent=quizConfig.theme||"Quiz"; if(elements.resultContainer)elements.resultContainer.classList.add('hide'); if(elements.scoreContainer)elements.scoreContainer.classList.add('hide'); if(elements.nextBtn)elements.nextBtn.classList.add('hide'); if(elements.finishBtn)elements.finishBtn.classList.add('hide'); if(elements.endQuizEarlyBtn)elements.endQuizEarlyBtn.classList.add('hide'); if(elements.confirmBtn){elements.confirmBtn.classList.remove('hide');elements.confirmBtn.disabled=true;}else console.error("ConfirmBtn não encontrado!"); if(elements.backToMainMenuBtn)elements.backToMainMenuBtn.classList.remove('hide'); showQuestion(quizData[currentQuestionIndex],elements);
}

/**
 * Atualiza a barra de progresso visual e textual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function updateProgressBar(elements) {
    if (!quizData || !elements.progressBarIndicator || !elements.progressTextElement) return; const t=quizData.length; const c=currentQuestionIndex+1; if(t===0){elements.progressBarIndicator.style.width='0%';elements.progressTextElement.textContent='0/0';return;} const p=Math.min((c/t)*100,100); elements.progressBarIndicator.style.width=`${p}%`; elements.progressTextElement.textContent=`Questão ${c} de ${t}`;
}

/**
 * Exibe a questão atual e suas opções embaralhadas.
 * @param {object} questionData - O objeto da questão atual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showQuestion(questionData, elements) {
    console.log(`showQ: Idx ${currentQuestionIndex}`); isAnswered=false; selectedOptionElement=null; if(elements.answerOptionsElement) elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(f=>f.style.outline='none'); if(!questionData?.question){console.error("Questão inválida:",currentQuestionIndex,questionData);if(elements.messageArea)showMessage(elements.messageArea,"Erro questão",5000);showResults(elements);return;} if(elements.questionTextElement)elements.questionTextElement.innerText=questionData.question; else console.error("questionTextElement!"); if(elements.answerOptionsElement)elements.answerOptionsElement.innerHTML=''; else{console.error("answerOptionsElement!");return;} if(elements.messageArea)clearMessage(elements.messageArea); if(!questionData.options?.length){console.error("Opções inválidas:",questionData);if(elements.messageArea)showMessage(elements.messageArea,"Erro opções",5000);nextQuestion(elements);return;} let opts=[...questionData.options]; shuffleArray(opts); opts.forEach(opt=>{if(!opt?.text){console.warn("Opção inválida:",opt);return;} const oF=document.createElement('div');oF.className='option-frame';oF.dataset.optionText=opt.text; const fF=document.createElement('div');fF.className='front-face';fF.textContent=opt.text; const bF=document.createElement('div');bF.className='back-face'; const eS=document.createElement('span');eS.className='explanation';eS.textContent=opt.explanation||'Sem explicação.'; bF.appendChild(eS); oF.appendChild(fF);oF.appendChild(bF); oF.addEventListener('click',(e)=>selectAnswer(e,elements)); if(elements.answerOptionsElement)elements.answerOptionsElement.appendChild(oF);}); if(elements.confirmBtn){elements.confirmBtn.classList.remove('hide');elements.confirmBtn.disabled=true;} if(elements.nextBtn)elements.nextBtn.classList.add('hide'); if(elements.finishBtn)elements.finishBtn.classList.add('hide'); if(elements.endQuizEarlyBtn)elements.endQuizEarlyBtn.classList.add('hide'); if(elements.questionContainer)elements.questionContainer.classList.remove('hide'); else console.error("questionContainer!"); updateProgressBar(elements);
}

/**
 * Lida com o clique em uma opção de resposta, marcando-a como selecionada.
 * @param {Event} event - O evento de clique.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function selectAnswer(event, elements) {
    if(isAnswered)return; if(elements.messageArea)clearMessage(elements.messageArea); const cF=event.currentTarget; if(!cF)return; if(elements.answerOptionsElement)elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(f=>{if(f!==cF)f.classList.remove('selected');}); cF.classList.toggle('selected'); if(cF.classList.contains('selected')){selectedOptionElement=cF; if(elements.confirmBtn)elements.confirmBtn.disabled=false;} else {selectedOptionElement=null; if(elements.confirmBtn)elements.confirmBtn.disabled=true;}
}

/**
 * Confirma a resposta selecionada, calcula a pontuação e mostra o feedback visual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function confirmAnswer(elements) {
    console.log('confirmAnswer...'); if(!selectedOptionElement){if(elements.messageArea)showMessage(elements.messageArea,"Selecione.",3000);return;} if(isAnswered){console.warn('Já respondido.');return;} isAnswered=true; if(elements.backToMainMenuBtn)elements.backToMainMenuBtn.classList.add('hide'); if(elements.confirmBtn){elements.confirmBtn.classList.add('hide');elements.confirmBtn.disabled=true;} if(elements.messageArea)clearMessage(elements.messageArea); try{const selTxt=selectedOptionElement.dataset.optionText; if(typeof selTxt==='undefined')throw new Error("No dataset.optionText"); if(!quizData?.[currentQuestionIndex]?.options)throw new Error(`Dados Q ${currentQuestionIndex} inválidos.`); const opts=quizData[currentQuestionIndex].options; const correctOpt=opts.find(o=>o?.isCorrect===true); if(!correctOpt?.text)throw new Error(`Correta não definida Q ${currentQuestionIndex}.`); const correctTxt=correctOpt.text; const isCorrect=(selTxt===correctTxt); if(isCorrect)score++; const allFrames=elements.answerOptionsElement?elements.answerOptionsElement.querySelectorAll('.option-frame'):[]; allFrames.forEach(f=>{if(!(f instanceof HTMLElement))return; const fTxt=f.dataset.optionText; if(typeof fTxt==='undefined')return; const oData=opts.find(o=>o?.text===fTxt); f.classList.add('reveal','disabled'); if(oData){f.classList.toggle('correct',oData.isCorrect===true); f.classList.toggle('incorrect',oData.isCorrect!==true);} else f.classList.add('incorrect'); if(f===selectedOptionElement){f.style.outline='3px solid #333';f.style.outlineOffset='2px';}else f.style.outline='none';}); updateScoreDisplay(elements); if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide'); const isLast=currentQuestionIndex>=quizData.length-1; setTimeout(()=>{if(elements.finishBtn)elements.finishBtn.classList.toggle('hide',!isLast); if(elements.nextBtn)elements.nextBtn.classList.toggle('hide',isLast); if(elements.endQuizEarlyBtn)elements.endQuizEarlyBtn.classList.toggle('hide',isLast);},800); }catch(err){console.error("ERRO confirmAnswer:",err);if(elements.messageArea)showMessage(elements.messageArea,`Erro: ${err.message}.`,6000); if(elements.finishBtn)elements.finishBtn.classList.add('hide'); if(elements.nextBtn)elements.nextBtn.classList.add('hide'); if(elements.endQuizEarlyBtn)elements.endQuizEarlyBtn.classList.add('hide');}
}

/**
 * Avança para a próxima questão ou mostra os resultados se for a última.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function nextQuestion(elements) {
    console.log("nextQuestion",currentQuestionIndex); if(selectedOptionElement?.style)selectedOptionElement.style.outline='none'; currentQuestionIndex++; if(currentQuestionIndex<quizData.length){showQuestion(quizData[currentQuestionIndex],elements);}else{showResults(elements);}
}

/**
 * Exibe a tela de resultados finais do quiz.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showResults(elements) {
    console.log("showResults"); if(elements.backToMainMenuBtn)elements.backToMainMenuBtn.classList.add('hide'); showOnly(elements.quizContainer,elements.selectionArea,elements.quizContainer,elements.questionCountSelectionContainer); if(elements.questionContainer)elements.questionContainer.classList.add('hide'); if(elements.progressContainer)elements.progressContainer.classList.add('hide'); if(elements.controlsContainer)elements.controlsContainer.classList.add('hide'); if(elements.messageArea)clearMessage(elements.messageArea); if(!elements.resultContainer){console.error("No result container!");if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide');updateScoreDisplay(elements);return;} elements.resultContainer.classList.remove('hide'); if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide'); const finalScore=calculateFinalScoreString(); const totalQ=quizData.length; elements.resultContainer.innerHTML=`<h2>Quiz '${quizConfig.theme||'Quiz'}' Finalizado!</h2><p>Acertos: <strong>${score}</strong> de <strong>${totalQ}</strong>.</p><p>Pontuação: <strong>${finalScore}</strong></p><button id="choose-another-theme-btn" class="control-btn back-btn" style="background-color:#007bff;color:white;">Jogar Novamente</button>`; const btn=document.getElementById('choose-another-theme-btn'); if(btn){btn.addEventListener('click',()=>{if(elements.resultContainer)elements.resultContainer.classList.add('hide'); if(elements.scoreContainer)elements.scoreContainer.classList.add('hide'); showThemeSelectionScreen(elements);});}else console.error("#choose-another-theme-btn não encontrado."); updateScoreDisplay(elements);
}

/**
 * Atualiza os elementos que exibem a pontuação atual ou final.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function updateScoreDisplay(elements) {
    console.log("updateScoreDisplay"); if(!elements.scoreContainer||!elements.pointsDisplayContainer||!elements.percentageDisplayContainer||!elements.scoreValueElement||!elements.scorePercentageElement){console.error("Score elements missing.");return;} if(!quizConfig?.scoring){console.warn("Scoring config missing.");elements.pointsDisplayContainer.classList.add('hide');elements.percentageDisplayContainer.classList.add('hide');elements.scoreContainer.classList.remove('hide');return;} const scoreStr=calculateFinalScoreString(); if(scoreStr==="Erro"||scoreStr==="N/A"){console.warn("Invalid score string.");elements.scoreValueElement.textContent="...";elements.scorePercentageElement.textContent="...";elements.pointsDisplayContainer.classList.add('hide');elements.percentageDisplayContainer.classList.add('hide');elements.scoreContainer.classList.remove('hide');return;} const isPerc=quizConfig.scoring==="percentage"; if(isPerc){elements.scorePercentageElement.textContent=scoreStr.replace('%','');elements.percentageDisplayContainer.classList.remove('hide');elements.pointsDisplayContainer.classList.add('hide');}else{const val=scoreStr.split(' ')[0];elements.scoreValueElement.textContent=val;elements.pointsDisplayContainer.classList.remove('hide');elements.percentageDisplayContainer.classList.add('hide');} elements.scoreContainer.classList.remove('hide');
}

/**
 * Calcula a string formatada para exibição da pontuação.
 * @returns {string} A pontuação formatada ou "N/A" ou "Erro".
 */
function calculateFinalScoreString() {
    console.log("calcFinalScoreString"); if(!quizConfig?.scoring||!quizData){return"N/A";} const numQ=quizData.length; if(numQ===0)return"0"; if(typeof score!=='number'||isNaN(score))return"Erro"; let scoreStr="Erro"; try{if(quizConfig.scoring==="percentage"){scoreStr=`${Math.round((score/numQ)*100)}%`;}else{const totPts=quizConfig.totalPoints; const origQ=fullQuizData?.length??0; let currVal; let totStr=''; if(totPts&&typeof totPts==='number'&&totPts>0&&origQ>0){currVal=Math.round(score*(totPts/origQ));totStr=` / ${totPts}`;}else{currVal=score;totStr=` / ${numQ}`;} const unit= " ponto"+(currVal!==1?"s":""); scoreStr=`${currVal}${totStr}${unit}`;}}catch(e){console.error("Erro calc score:",e);scoreStr="Erro";} return scoreStr;
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
    if(!(messageAreaElement instanceof Element)){console.warn("showMessage: Elem inválido.");return;} let timeoutVar=useSpecificTimeout?countMessageTimeout:messageTimeout; const setter=(nT)=>{if(useSpecificTimeout)countMessageTimeout=nT;else messageTimeout=nT;}; if(timeoutVar){clearTimeout(timeoutVar);setter(null);} messageAreaElement.textContent=message; messageAreaElement.className='message-area'; messageAreaElement.classList.add(isError?'error':'success'); messageAreaElement.classList.remove('hide'); const nTID=setTimeout(()=>{messageAreaElement.classList.add('hide');messageAreaElement.textContent='';messageAreaElement.classList.remove('error','success');setter(null);},duration); setter(nTID);
}

/**
 * Limpa imediatamente qualquer mensagem na área especificada.
 * @param {HTMLElement} messageAreaElement - O elemento da mensagem.
 * @param {boolean} [useSpecificTimeout=false] - Se true, limpa o timeout específico da tela de contagem.
 */
function clearMessage(messageAreaElement, useSpecificTimeout = false) {
     if(!(messageAreaElement instanceof Element))return; let timeoutVar=useSpecificTimeout?countMessageTimeout:messageTimeout; const setter=(nT)=>{if(useSpecificTimeout)countMessageTimeout=nT;else messageTimeout=nT;}; if(timeoutVar){clearTimeout(timeoutVar);setter(null);} messageAreaElement.classList.add('hide'); messageAreaElement.textContent=''; messageAreaElement.classList.remove('error','success');
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
        backToThemesBtn: document.getElementById('back-to-themes-btn'), // <<< Voltar de Subtema
        questionCountSelectionContainer: document.getElementById('question-count-selection'),
        questionCountTitleElement: document.getElementById('question-count-title'),
        maxQuestionsInfoElement: document.getElementById('max-questions-info'),
        questionCountButtonsContainer: document.getElementById('question-count-buttons'), // Container para botões %
        backToSelectionFromCountBtn: document.getElementById('back-to-selection-from-count-btn'), // <<< Voltar da Contagem
        questionCountMessageArea: document.getElementById('question-count-message'),
        quizContainer: document.getElementById('quiz-container'),
        quizTitleElement: document.getElementById('quiz-title'),
        backToMainMenuBtn: document.getElementById('back-to-main-menu-btn'), // <<< NOVO: Voltar ao Menu (do Quiz)
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
        endQuizEarlyBtn: document.getElementById('end-quiz-early-btn'), // <<< NOVO: Finalizar Agora
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
            const criticalIdsForCheck = ['selectionArea', 'quizContainer', 'questionCountSelectionContainer', 'mainContainer', 'confirmBtn', 'answerOptionsElement', 'questionCountButtonsContainer', 'backToThemesBtn', 'backToSelectionFromCountBtn', 'backToMainMenuBtn', 'endQuizEarlyBtn'];
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

    // --- Configuração dos Listeners Estáticos ---

    // Listener para o Botão Voltar (Subtema -> Tema) - CORRIGIDO
    if (elements.backToThemesBtn && elements.subthemeSelectionContainer && elements.themeSelectionContainer) {
        console.log("Adicionando listener ao botão #back-to-themes-btn (Voltar de Subtemas)");
        elements.backToThemesBtn.addEventListener('click', () => {
            console.log(">>> Botão 'Voltar aos Temas' (de subtema) CLICADO!");
            elements.subthemeSelectionContainer.classList.add('hide');
            elements.themeSelectionContainer.classList.remove('hide');
            currentSelectedTheme = null; // Limpa tema pai ao voltar para a lista principal
            console.log("<<< Subtemas escondidos, Temas mostrados.");
        });
    } else { console.error("Não foi possível adicionar listener ao #back-to-themes-btn."); }

    // Listener para o NOVO botão Voltar ao Menu (do Quiz -> Seleção de Temas)
    if (elements.backToMainMenuBtn) {
        elements.backToMainMenuBtn.addEventListener('click', () => {
            console.log("Botão 'Voltar ao Menu' (do quiz) clicado.");
            // Adicionar confirmação se quiser: if (confirm("Deseja realmente sair do quiz e voltar ao menu?")) { ... }
            showThemeSelectionScreen(elements);
        });
    } else { console.warn("#back-to-main-menu-btn não encontrado."); }


    // Listener para o NOVO botão Finalizar Agora
    if (elements.endQuizEarlyBtn) {
        elements.endQuizEarlyBtn.addEventListener('click', () => {
            console.log("Botão 'Finalizar Agora' clicado.");
             // Adicionar confirmação se quiser: if (confirm("Deseja finalizar o quiz agora?")) { ... }
            showResults(elements);
        });
    } else { console.warn("#end-quiz-early-btn não encontrado."); }

    // Outros Listeners Estáticos (Confirmar, Próxima, Finalizar [original])
    if (elements.confirmBtn) elements.confirmBtn.addEventListener('click', () => confirmAnswer(elements)); else console.error("#confirm-btn não encontrado!");
    if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => nextQuestion(elements)); else console.warn("#next-btn não encontrado.");
    if (elements.finishBtn) elements.finishBtn.addEventListener('click', () => showResults(elements)); else console.warn("#finish-btn não encontrado.");
    // Listener para backToSelectionFromCountBtn (Voltar da tela de contagem) é adicionado dinamicamente em showQuestionCountSelection

    // Inicia a aplicação
    console.log("Iniciando aplicação...");
    showThemeSelectionScreen(elements); // Mostra a tela inicial

    // Log final
    const now = new Date(); let options = { hour12: false, timeZone: 'America/Sao_Paulo' }; try { options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { console.warn("Timezone não detectado."); }
    console.log(`Interface JS pronta: ${now.toLocaleString('pt-BR', options)} (${options.timeZone})`);
});