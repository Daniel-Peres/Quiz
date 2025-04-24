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
let quizJustStarted = true; // Flag para controlar visibilidade inicial dos botões no quiz

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

    // Usa showOnly para garantir que só a área de seleção esteja visível
    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    console.log("showSubthemeSelectionScreen: showOnly executado.");

    // Dentro da área de seleção, esconde temas e mostra subtemas
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.add('hide');
    if (elements.subthemeSelectionContainer) {
         console.log("showSubthemeSelectionScreen: Tentando remover 'hide' de subthemeSelectionContainer...");
         console.log("showSubthemeSelectionScreen: Elemento é:", elements.subthemeSelectionContainer); // Verifica se o elemento é válido
        elements.subthemeSelectionContainer.classList.remove('hide'); // Mostra container de subtemas
         console.log("showSubthemeSelectionScreen: 'hide' REMOVIDO de subthemeSelectionContainer.");
         try { console.log("showSubthemeSelectionScreen: Visibilidade atual:", window.getComputedStyle(elements.subthemeSelectionContainer).display); } catch (e) { console.warn("Não foi possível obter o estilo computado de subthemeSelectionContainer", e);}
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
    try { const r=await fetch(themesPath); if(!r.ok)throw new Error(`HTTP ${r.status}`); allThemesData=await r.json(); if(!Array.isArray(allThemesData))throw new Error("Formato inválido."); console.log('loadThemes: OK',allThemesData); populateThemeButtons(allThemesData,elements);}catch(e){console.error("Falha CRÍTICA loadThemes:",e); if(elements.themeButtonsContainer)elements.themeButtonsContainer.innerHTML=`<p style="color:red;">Erro: ${e.message}. Verifique F12.</p>`;}
}

/**
 * Cria os botões de seleção de tema na interface.
 * @param {Array} themes - Array com os objetos de tema.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function populateThemeButtons(themes, elements) {
    console.log('pTB'); if (!elements.themeButtonsContainer){console.error("No themeButtonsContainer.");return;} elements.themeButtonsContainer.innerHTML=''; if(!themes?.length){elements.themeButtonsContainer.innerHTML='<p>Nada encontrado.</p>';return;} themes.forEach(t=>{if(!t?.id||!t.name){console.warn("Tema inválido:",t);return;} const b=document.createElement('button'); b.className='theme-btn'; b.dataset.themeId=t.id; let h=`<strong>${t.name}</strong>`; if(t.description)h+=`<span class="description">${t.description}</span>`; b.innerHTML=h; b.addEventListener('click',(e)=>handleThemeSelection(e,elements)); elements.themeButtonsContainer.appendChild(b);});
}

/**
 * Cria os botões de seleção de subtema na interface.
 * @param {Array} subThemes - Array com os objetos de subtema.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function populateSubthemeButtons(subThemes, elements) {
     console.log('pSTB'); if(!elements.subthemeButtonsContainer){console.error("No subthemeButtonsContainer.");return;} elements.subthemeButtonsContainer.innerHTML=''; if(!subThemes?.length){elements.subthemeButtonsContainer.innerHTML='<p>Nada encontrado.</p>';return;} subThemes.forEach(st=>{if(!st?.file||!st.name){console.warn("Subtema inválido:",st);return;} const b=document.createElement('button'); b.className='theme-btn'; b.dataset.file=st.file; let h=`<strong>${st.name}</strong>`; if(st.description)h+=`<span class="description">${st.description}</span>`; b.innerHTML=h; b.addEventListener('click',(e)=>handleSubthemeSelection(e,elements)); elements.subthemeButtonsContainer.appendChild(b);});
}

/**
 * Carrega os dados (config e questões) de um arquivo JSON de quiz específico.
 * @param {string} filename - O caminho relativo do arquivo JSON do quiz (dentro da pasta 'data').
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
async function loadQuizData(filename, elements) {
    console.log(`loadQuizData: ${filename}`); fullQuizData=[]; quizConfig={}; desiredQuestionCount=0; showOnly(null,elements.selectionArea,elements.quizContainer,elements.questionCountSelectionContainer); let lM=document.getElementById('loading-quiz-msg'); if(!lM&&elements.mainContainer){lM=document.createElement('p');lM.id='loading-quiz-msg';lM.textContent='Carregando...';lM.style.cssText='text-align:center;padding:20px;'; elements.mainContainer.appendChild(lM);}else if(lM){lM.textContent='Carregando...';lM.style.color='inherit';lM.classList.remove('hide');} const eBB=document.getElementById('back-to-themes-btn-error'); if(eBB)eBB.remove(); const qP=`data/${filename}`; try{console.log(`Fetch: ${qP}`); const r=await fetch(qP); if(!r.ok)throw new Error(`HTTP ${r.status}`); const jD=await r.json(); if(!jD||typeof jD!=='object')throw new Error("JSON inválido."); if(!jD.config||typeof jD.config!=='object')throw new Error("Config inválida."); if(!jD.data||!Array.isArray(jD.data))throw new Error("Data inválido."); if(jD.data.length===0)throw new Error("Data vazio."); fullQuizData=jD.data; quizConfig=jD.config; console.log(`Quiz '${quizConfig.theme||'N/A'}' ${fullQuizData.length} Qs.`); if(lM)lM.classList.add('hide'); showQuestionCountSelection(fullQuizData.length,elements);}catch(e){console.error("Falha loadQuizData:",filename,e); if(lM){lM.textContent=`Erro: ${e.message}`; lM.style.color='red';lM.classList.remove('hide');}else if(elements.mainContainer){elements.mainContainer.innerHTML=`<p id="loading-quiz-msg" style="color:red;text-align:center;padding:20px;">Erro: ${e.message}</p>`;lM=document.getElementById('loading-quiz-msg');} if(lM&&!document.getElementById('back-to-themes-btn-error')){const bB=document.createElement('button');bB.textContent='Voltar';bB.id='back-to-themes-btn-error';bB.className='control-btn back-btn';bB.style.cssText='margin-top:20px;display:block;margin-left:auto;margin-right:auto;';bB.onclick=()=>showThemeSelectionScreen(elements); lM.parentNode.insertBefore(bB,lM.nextSibling);} if(elements.quizContainer)elements.quizContainer.classList.add('hide'); if(elements.questionCountSelectionContainer)elements.questionCountSelectionContainer.classList.add('hide');}
}

/**
 * Lida com o clique em um botão de tema principal.
 * @param {Event} event - O evento de clique.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function handleThemeSelection(event, elements) {
    const tId=event.currentTarget.dataset.themeId; console.log("hTS:",tId); const sT=allThemesData.find(t=>t&&t.id===tId); if(!sT){console.error(`Tema ${tId} não encontrado.`);return;} if(sT.subThemes?.length>0){showSubthemeSelectionScreen(sT,elements);}else if(sT.file){loadQuizData(sT.file,elements);}else{console.error(`Tema ${sT.name} inválido.`); const ea=elements.messageArea||elements.themeButtonsContainer;if(ea)showMessage(ea,`Config inválida: ${sT.name}.`,5000);}
}

/**
 * Lida com o clique em um botão de subtema.
 * @param {Event} event - O evento de clique.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function handleSubthemeSelection(event, elements) {
    const f=event.currentTarget.dataset.file; console.log("hSTS:",f); if(f){loadQuizData(f,elements);}else{console.error("No data-file."); const ea=elements.messageArea||elements.subthemeButtonsContainer;if(ea)showMessage(ea,`Erro: arquivo não especificado.`,5000);}
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
    console.log("sQCS: Max=",maxQuestions); if(!elements.questionCountSelectionContainer){console.error("No #qcs.");showThemeSelectionScreen(elements);return;} if(!elements.questionCountButtonsContainer){console.error("No #qcb.");} showOnly(elements.questionCountSelectionContainer,elements.selectionArea,elements.quizContainer,elements.questionCountSelectionContainer); if(elements.questionCountTitleElement)elements.questionCountTitleElement.textContent=`Quantidade para '${quizConfig.theme||'quiz'}'?`; if(elements.maxQuestionsInfoElement)elements.maxQuestionsInfoElement.textContent=maxQuestions; if(elements.questionCountMessageArea)clearMessage(elements.questionCountMessageArea,true); if(elements.questionCountButtonsContainer){elements.questionCountButtonsContainer.innerHTML=''; const percs=[0.25,0.5,0.75,1.0]; const added=new Set(); percs.forEach(p=>{let c=(p===1.0)?maxQuestions:Math.max(1,Math.round(maxQuestions*p)); c=Math.min(c,maxQuestions); if(c>0&&(!added.has(c)||p===1.0)){added.add(c); const b=document.createElement('button');b.className='control-btn count-btn'; const pTxt=p===1.0?"Todas":`${Math.round(p*100)}%`; b.textContent=`${pTxt} (${c} Questões)`; b.dataset.count=c; b.addEventListener('click',()=>{desiredQuestionCount=parseInt(b.dataset.count);console.log("Num:",desiredQuestionCount);if(elements.questionCountSelectionContainer)elements.questionCountSelectionContainer.classList.add('hide');startGame(elements);}); elements.questionCountButtonsContainer.appendChild(b);}}); } if(elements.backToSelectionFromCountBtn){const oB=elements.backToSelectionFromCountBtn; const nB=oB.cloneNode(true); if(oB.parentNode){oB.parentNode.replaceChild(nB,oB); elements.backToSelectionFromCountBtn=nB; nB.addEventListener('click',()=>{console.log(">>> Voltar (contagem) CLICADO!"); console.log("currentSelectedTheme:",currentSelectedTheme); if(elements.questionCountSelectionContainer)elements.questionCountSelectionContainer.classList.add('hide'); if(currentSelectedTheme?.subThemes?.length>0){console.log("<<< Voltando SUBTEMAS."); showSubthemeSelectionScreen(currentSelectedTheme,elements);}else{console.log("<<< Voltando TEMAS."); showThemeSelectionScreen(elements);}}); console.log("Listener Voltar (contagem) OK.");}else{console.error("Pai Voltar (contagem) não encontrado.");}}else{console.error("#back-to-selection-from-count-btn não encontrado.");}
}

/**
 * Inicia o quiz com as questões selecionadas.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function startGame(elements) {
    console.log("startGame: Iniciando...");
    quizJustStarted = true; // Define que o quiz acabou de começar
    const eb=document.getElementById('back-to-themes-btn-error'); if(eb) eb.remove();
    if(!fullQuizData?.length){console.error("ERRO: start sem fullQuizData.");showThemeSelectionScreen(elements);return;}
    const max=fullQuizData.length; if(desiredQuestionCount<=0||desiredQuestionCount>max)desiredQuestionCount=max;
    let qs=[...fullQuizData]; shuffleArray(qs); quizData=qs.slice(0,desiredQuestionCount);
    if(!quizData?.length){console.error("ERRO: quizData vazio.");showThemeSelectionScreen(elements);return;}
    console.log(`Iniciando com ${quizData.length} de ${max}.`);

    showQuizInterface(elements); // Mostra a interface principal

    // Reseta estado
    currentQuestionIndex = 0; score = 0; isAnswered = false; selectedOptionElement = null;
    if(elements.messageArea) clearMessage(elements.messageArea);
    if(elements.quizTitleElement) elements.quizTitleElement.textContent = quizConfig.theme || "Quiz";
    if(elements.resultContainer) elements.resultContainer.classList.add('hide');
    if(elements.scoreContainer) elements.scoreContainer.classList.add('hide');

    // Configura botões iniciais do quiz
    if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    if(elements.finishBtn) elements.finishBtn.classList.add('hide');
    if(elements.endQuizEarlyBtn) elements.endQuizEarlyBtn.classList.add('hide');
    if(elements.confirmBtn) { elements.confirmBtn.classList.remove('hide'); elements.confirmBtn.disabled = true; } else { console.error("ConfirmBtn não encontrado!"); }
    // Mostra botões "Voltar" e "Menu Principal" que ficam nos controles
    if (elements.quizBackBtn) elements.quizBackBtn.classList.remove('hide'); else { console.warn("#quiz-back-btn não encontrado."); }
    if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.remove('hide'); else { console.warn("#quiz-main-menu-btn não encontrado."); }

    showQuestion(quizData[currentQuestionIndex], elements); // Mostra a primeira questão
}

/**
 * Atualiza a barra de progresso visual e textual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function updateProgressBar(elements) {
    if(!quizData||!elements.progressBarIndicator||!elements.progressTextElement)return; const t=quizData.length; const c=currentQuestionIndex+1; if(t===0){elements.progressBarIndicator.style.width='0%';elements.progressTextElement.textContent='0/0';return;} const p=Math.min((c/t)*100,100); elements.progressBarIndicator.style.width=`${p}%`; elements.progressTextElement.textContent=`Questão ${c} de ${t}`;
}

/**
 * Exibe a questão atual e suas opções embaralhadas.
 * @param {object} questionData - O objeto da questão atual.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function showQuestion(questionData, elements) {
    console.log(`showQ: Idx ${currentQuestionIndex}`); isAnswered=false; selectedOptionElement=null; if(elements.answerOptionsElement)elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(f=>f.style.outline='none'); if(!questionData?.question){console.error("Questão inválida:",currentQuestionIndex,questionData);if(elements.messageArea)showMessage(elements.messageArea,"Erro questão",5000);showResults(elements);return;} if(elements.questionTextElement)elements.questionTextElement.innerText=questionData.question; else console.error("questionTextElement!"); if(elements.answerOptionsElement)elements.answerOptionsElement.innerHTML=''; else{console.error("answerOptionsElement!");return;} if(elements.messageArea)clearMessage(elements.messageArea); if(!questionData.options?.length){console.error("Opções inválidas:",questionData);if(elements.messageArea)showMessage(elements.messageArea,"Erro opções",5000);nextQuestion(elements);return;} let opts=[...questionData.options]; shuffleArray(opts); opts.forEach(opt=>{if(!opt?.text){console.warn("Opção inválida:",opt);return;} const oF=document.createElement('div');oF.className='option-frame';oF.dataset.optionText=opt.text; const fF=document.createElement('div');fF.className='front-face';fF.textContent=opt.text; const bF=document.createElement('div');bF.className='back-face'; const eS=document.createElement('span');eS.className='explanation';eS.textContent=opt.explanation||'Sem explicação.'; bF.appendChild(eS); oF.appendChild(fF);oF.appendChild(bF); oF.addEventListener('click',(e)=>selectAnswer(e,elements)); if(elements.answerOptionsElement)elements.answerOptionsElement.appendChild(oF);});

    // Visibilidade dos botões ao mostrar uma questão
    if (quizJustStarted) {
         if (elements.quizBackBtn) elements.quizBackBtn.classList.remove('hide');
         if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.remove('hide');
         if (elements.confirmBtn) { elements.confirmBtn.classList.remove('hide'); elements.confirmBtn.disabled = true; }
         if(elements.nextBtn) elements.nextBtn.classList.add('hide');
         if(elements.finishBtn) elements.finishBtn.classList.add('hide');
         if(elements.endQuizEarlyBtn) elements.endQuizEarlyBtn.classList.add('hide');
    } else {
         // Esconde botões iniciais se não for a primeira interação
         if (elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
         if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');
         // Mostra Confirmar (será desabilitado até selecionar)
         if (elements.confirmBtn) { elements.confirmBtn.classList.remove('hide'); elements.confirmBtn.disabled = true; }
         // Garante que os outros de pós-resposta estão escondidos
         if(elements.nextBtn) elements.nextBtn.classList.add('hide');
         if(elements.finishBtn) elements.finishBtn.classList.add('hide');
         if(elements.endQuizEarlyBtn) elements.endQuizEarlyBtn.classList.add('hide');
    }

    if(elements.questionContainer)elements.questionContainer.classList.remove('hide'); else console.error("questionContainer!"); updateProgressBar(elements);
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
 * Confirma a resposta selecionada, calcula pontuação, mostra feedback e ajusta botões.
 * @param {object} elements - Objeto com referências aos elementos do DOM.
 */
function confirmAnswer(elements) {
    console.log('confirmAnswer...'); if(!selectedOptionElement){if(elements.messageArea)showMessage(elements.messageArea,"Selecione.",3000);return;} if(isAnswered){console.warn('Já respondido.');return;}
    isAnswered = true; quizJustStarted = false; // Marca que o quiz começou

    // Esconde botões iniciais (Voltar e Menu Principal)
    if (elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
    if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');
    if (elements.confirmBtn){elements.confirmBtn.classList.add('hide');elements.confirmBtn.disabled=true;}
    if (elements.messageArea)clearMessage(elements.messageArea);

    try{const selTxt=selectedOptionElement.dataset.optionText;if(typeof selTxt==='undefined')throw new Error("No dataset");if(!quizData?.[currentQuestionIndex]?.options)throw new Error(`Dados Q ${currentQuestionIndex}`); const opts=quizData[currentQuestionIndex].options; const correctOpt=opts.find(o=>o?.isCorrect===true);if(!correctOpt?.text)throw new Error(`Correta Q ${currentQuestionIndex}`); const correctTxt=correctOpt.text; const isCorrect=(selTxt===correctTxt);if(isCorrect)score++; const allFrames=elements.answerOptionsElement?elements.answerOptionsElement.querySelectorAll('.option-frame'):[];allFrames.forEach(f=>{if(!(f instanceof HTMLElement))return; const fTxt=f.dataset.optionText;if(typeof fTxt==='undefined')return; const oData=opts.find(o=>o?.text===fTxt); f.classList.add('reveal','disabled'); if(oData){f.classList.toggle('correct',oData.isCorrect===true);f.classList.toggle('incorrect',oData.isCorrect!==true);}else f.classList.add('incorrect'); if(f===selectedOptionElement){f.style.outline='3px solid #333';f.style.outlineOffset='2px';}else f.style.outline='none';}); updateScoreDisplay(elements); if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide');

        // Mostra botões pós-resposta
        const isLast=currentQuestionIndex>=quizData.length-1;
        setTimeout(()=>{
            if(elements.finishBtn) elements.finishBtn.classList.toggle('hide', !isLast);
            if(elements.nextBtn) elements.nextBtn.classList.toggle('hide', isLast);
            if(elements.endQuizEarlyBtn) elements.endQuizEarlyBtn.classList.toggle('hide', isLast);
        },800);
    }catch(err){console.error("ERRO confirmAnswer:",err);if(elements.messageArea)showMessage(elements.messageArea,`Erro: ${err.message}.`,6000); if(elements.finishBtn)elements.finishBtn.classList.add('hide'); if(elements.nextBtn)elements.nextBtn.classList.add('hide'); if(elements.endQuizEarlyBtn)elements.endQuizEarlyBtn.classList.add('hide'); if(elements.quizBackBtn)elements.quizBackBtn.classList.add('hide'); if(elements.quizMainMenuBtn)elements.quizMainMenuBtn.classList.add('hide');}
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
    console.log("showResults");
    // Esconde botões que poderiam estar visíveis
    if (elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
    if (elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');

    showOnly(elements.quizContainer,elements.selectionArea,elements.quizContainer,elements.questionCountSelectionContainer); if(elements.questionContainer)elements.questionContainer.classList.add('hide'); if(elements.progressContainer)elements.progressContainer.classList.add('hide'); if(elements.controlsContainer)elements.controlsContainer.classList.add('hide'); if(elements.messageArea)clearMessage(elements.messageArea); if(!elements.resultContainer){console.error("No result container!");if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide');updateScoreDisplay(elements);return;} elements.resultContainer.classList.remove('hide'); if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide'); const finalScore=calculateFinalScoreString(); const totalQ=quizData.length; elements.resultContainer.innerHTML=`<h2>Quiz '${quizConfig.theme||'Quiz'}' Finalizado!</h2><p>Acertos: <strong>${score}</strong> de <strong>${totalQ}</strong>.</p><p>Pontuação: <strong>${finalScore}</strong></p><button id="choose-another-theme-btn" class="control-btn back-btn" style="background-color:#007bff;color:white;">Jogar Novamente</button>`; const btn=document.getElementById('choose-another-theme-btn'); if(btn){btn.addEventListener('click',()=>{if(elements.resultContainer)elements.resultContainer.classList.add('hide'); if(elements.scoreContainer)elements.scoreContainer.classList.add('hide'); showThemeSelectionScreen(elements);});}else console.error("#choose-another-theme-btn não encontrado."); updateScoreDisplay(elements);
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

    // Mapeamento dos elementos do DOM (MODIFICADO)
    const elements = {
        mainContainer: document.querySelector('.main-container'),
        selectionArea: document.getElementById('selection-area'),
        themeSelectionContainer: document.getElementById('theme-selection-container'),
        themeButtonsContainer: document.getElementById('theme-buttons'),
        subthemeSelectionContainer: document.getElementById('subtheme-selection-container'),
        subthemeTitleElement: document.getElementById('subtheme-title'),
        subthemeButtonsContainer: document.getElementById('subtheme-buttons'),
        backToThemesBtn: document.getElementById('back-to-themes-btn'), // Voltar de Subtema->Tema
        questionCountSelectionContainer: document.getElementById('question-count-selection'),
        questionCountTitleElement: document.getElementById('question-count-title'),
        maxQuestionsInfoElement: document.getElementById('max-questions-info'),
        questionCountButtonsContainer: document.getElementById('question-count-buttons'), // Container botões %
        backToSelectionFromCountBtn: document.getElementById('back-to-selection-from-count-btn'), // Voltar da Contagem
        questionCountMessageArea: document.getElementById('question-count-message'),
        quizContainer: document.getElementById('quiz-container'),
        quizTitleElement: document.getElementById('quiz-title'),
        quizBackBtn: document.getElementById('quiz-back-btn'),                 // <<< NOVO: Voltar (Quiz->Contagem)
        quizMainMenuBtn: document.getElementById('quiz-main-menu-btn'),         // <<< NOVO: Menu Principal (Quiz->Temas)
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
        endQuizEarlyBtn: document.getElementById('end-quiz-early-btn'),         // <<< NOVO: Finalizar Agora
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
            const criticalIdsForCheck = ['selectionArea', 'quizContainer', 'questionCountSelectionContainer', 'mainContainer', 'confirmBtn', 'answerOptionsElement', 'questionCountButtonsContainer', 'backToThemesBtn', 'backToSelectionFromCountBtn', 'quizBackBtn', 'quizMainMenuBtn', 'endQuizEarlyBtn'];
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

    // Listener para o Botão Voltar (Subtema -> Tema)
    if (elements.backToThemesBtn) {
        elements.backToThemesBtn.addEventListener('click', () => {
            console.log(">>> Botão 'Voltar aos Temas' (de subtema) CLICADO!");
            if(elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
            if(elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');
            currentSelectedTheme = null;
            console.log("<<< Subtemas escondidos, Temas mostrados.");
        });
        console.log("Listener adicionado a #back-to-themes-btn OK.");
    } else { console.error("Não foi possível adicionar listener ao #back-to-themes-btn."); }

    // Listener para o NOVO botão Voltar (Quiz -> Seleção de Quantidade)
    if (elements.quizBackBtn) {
        elements.quizBackBtn.addEventListener('click', () => {
            console.log("Botão 'Voltar' (do quiz para contagem) clicado.");
             if (fullQuizData?.length > 0) { // Verifica se dados do quiz atual existem
                 showQuestionCountSelection(fullQuizData.length, elements);
             } else {
                  console.warn("Tentando voltar para contagem sem fullQuizData, voltando ao menu.");
                  showThemeSelectionScreen(elements); // Fallback
             }
        });
         console.log("Listener adicionado a #quiz-back-btn OK.");
    } else { console.warn("#quiz-back-btn não encontrado."); }

    // Listener para o NOVO botão Menu Principal (do Quiz -> Seleção de Temas)
    if (elements.quizMainMenuBtn) {
        elements.quizMainMenuBtn.addEventListener('click', () => {
            console.log("Botão 'Menu Principal' (do quiz) clicado.");
             // Adicionar confirmação opcional aqui
             // if (confirm("Voltar ao menu principal? O progresso será perdido.")) {
                   showThemeSelectionScreen(elements);
             // }
        });
        console.log("Listener adicionado a #quiz-main-menu-btn OK.");
    } else { console.warn("#quiz-main-menu-btn não encontrado."); }


    // Listener para o NOVO botão Finalizar Agora
    if (elements.endQuizEarlyBtn) {
        elements.endQuizEarlyBtn.addEventListener('click', () => {
            console.log("Botão 'Finalizar Agora' clicado.");
             // Adicionar confirmação opcional aqui
             // if (confirm("Finalizar o quiz agora com a pontuação atual?")) {
                   showResults(elements);
             // }
        });
        console.log("Listener adicionado a #end-quiz-early-btn OK.");
    } else { console.warn("#end-quiz-early-btn não encontrado."); }

    // Outros Listeners Estáticos (Confirmar, Próxima, Finalizar [original])
    if (elements.confirmBtn) elements.confirmBtn.addEventListener('click', () => confirmAnswer(elements)); else console.error("#confirm-btn não encontrado!");
    if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => nextQuestion(elements)); else console.warn("#next-btn não encontrado.");
    if (elements.finishBtn) elements.finishBtn.addEventListener('click', () => showResults(elements)); else console.warn("#finish-btn não encontrado.");
    // Listener para backToSelectionFromCountBtn (Voltar da tela de contagem) é adicionado dinamicamente

    // Inicia a aplicação
    console.log("Iniciando aplicação...");
    showThemeSelectionScreen(elements); // Mostra a tela inicial

    // Log final
    const now = new Date(); let options = { hour12: false, timeZone: 'America/Sao_Paulo' }; try { options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { console.warn("Timezone não detectado."); }
    console.log(`Interface JS pronta: ${now.toLocaleString('pt-BR', options)} (${options.timeZone})`);
});