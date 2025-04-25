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
    if(log) console.log("clearGameState: Limpando estado salvo.");
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

    isAnswered = false; // Always start fresh on the question
    selectedOptionElement = null;
    quizJustStarted = false;

    showQuizInterface(elements);
    if (elements.quizTitleElement) elements.quizTitleElement.textContent = quizConfig.theme || "Quiz";
    if (elements.resultContainer) elements.resultContainer.classList.add('hide');
    if (elements.scoreContainer) elements.scoreContainer.classList.remove('hide');
    updateScoreDisplay(elements);

    if(elements.quizBackBtn) elements.quizBackBtn.classList.add('hide');
    if(elements.quizMainMenuBtn) elements.quizMainMenuBtn.classList.add('hide');

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
        if(resumePrompt) resumePrompt.classList.add('hide');

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
    try { const r=await fetch(themesPath); if(!r.ok)throw new Error(`HTTP ${r.status}`); allThemesData=await r.json(); if(!Array.isArray(allThemesData))throw new Error("Formato inválido."); console.log('loadThemes: OK',allThemesData); populateThemeButtons(allThemesData,elements);}catch(e){console.error("Falha CRÍTICA loadThemes:",e); if(elements.themeButtonsContainer)elements.themeButtonsContainer.innerHTML=`<p style="color:red;">Erro: ${e.message}. Verifique F12.</p>`;}
}

function populateThemeButtons(themes, elements) {
    console.log('pTB'); if (!elements.themeButtonsContainer){console.error("No themeButtonsContainer.");return;} elements.themeButtonsContainer.innerHTML=''; if(!themes?.length){elements.themeButtonsContainer.innerHTML='<p>Nada encontrado.</p>';return;} themes.forEach(t=>{if(!t?.id||!t.name){console.warn("Tema inválido:",t);return;} const b=document.createElement('button'); b.className='theme-btn'; b.dataset.themeId=t.id; let h=`<strong>${t.name}</strong>`; if(t.description)h+=`<span class="description">${t.description}</span>`; b.innerHTML=h; b.addEventListener('click',(e)=>handleThemeSelection(e,elements)); elements.themeButtonsContainer.appendChild(b);});
}

function populateSubthemeButtons(subThemes, elements) {
     console.log('pSTB'); if(!elements.subthemeButtonsContainer){console.error("No subthemeButtonsContainer.");return;} elements.subthemeButtonsContainer.innerHTML=''; if(!subThemes?.length){elements.subthemeButtonsContainer.innerHTML='<p>Nada encontrado.</p>';return;} subThemes.forEach(st=>{if(!st?.file||!st.name){console.warn("Subtema inválido:",st);return;} const b=document.createElement('button'); b.className='theme-btn'; b.dataset.file=st.file; let h=`<strong>${st.name}</strong>`; if(st.description)h+=`<span class="description">${st.description}</span>`; b.innerHTML=h; b.addEventListener('click',(e)=>handleSubthemeSelection(e,elements)); elements.subthemeButtonsContainer.appendChild(b);});
}

async function loadQuizData(filename, elements) {
    console.log(`loadQuizData: ${filename}`);
    window.quizFilePath = filename;
    fullQuizData=[]; quizConfig={}; desiredQuestionCount=0; showOnly(null,elements.selectionArea,elements.quizContainer,elements.questionCountSelectionContainer); let lM=document.getElementById('loading-quiz-msg'); if(!lM&&elements.mainContainer){lM=document.createElement('p');lM.id='loading-quiz-msg';lM.textContent='Carregando...';lM.style.cssText='text-align:center;padding:20px;'; elements.mainContainer.appendChild(lM);}else if(lM){lM.textContent='Carregando...';lM.style.color='inherit';lM.classList.remove('hide');} const eBB=document.getElementById('back-to-themes-btn-error'); if(eBB)eBB.remove(); const qP=`data/${filename}`; try{console.log(`Workspace: ${qP}`); const r=await fetch(qP); if(!r.ok)throw new Error(`HTTP ${r.status}`); const jD=await r.json(); if(!jD||typeof jD!=='object')throw new Error("JSON inválido."); if(!jD.config||typeof jD.config!=='object')throw new Error("Config inválida."); if(!jD.data||!Array.isArray(jD.data))throw new Error("Data inválido."); if(jD.data.length===0)throw new Error("Data vazio."); fullQuizData=jD.data; quizConfig=jD.config; console.log(`Quiz '${quizConfig.theme||'N/A'}' ${fullQuizData.length} Qs.`); if(lM)lM.classList.add('hide'); showQuestionCountSelection(fullQuizData.length,elements);}catch(e){console.error("Falha loadQuizData:",filename,e); window.quizFilePath = null; if(lM){lM.textContent=`Erro: ${e.message}`; lM.style.color='red';lM.classList.remove('hide');}else if(elements.mainContainer){elements.mainContainer.innerHTML=`<p id="loading-quiz-msg" style="color:red;text-align:center;padding:20px;">Erro: ${e.message}</p>`;lM=document.getElementById('loading-quiz-msg');} if(lM&&!document.getElementById('back-to-themes-btn-error')){const bB=document.createElement('button');bB.textContent='Voltar';bB.id='back-to-themes-btn-error';bB.className='control-btn back-btn';bB.style.cssText='margin-top:20px;display:block;margin-left:auto;margin-right:auto;';bB.onclick=()=>showThemeSelectionScreen(elements); lM.parentNode.insertBefore(bB,lM.nextSibling);} if(elements.quizContainer)elements.quizContainer.classList.add('hide'); if(elements.questionCountSelectionContainer)elements.questionCountSelectionContainer.classList.add('hide');}
}

function handleThemeSelection(event, elements) {
    const tId=event.currentTarget.dataset.themeId; console.log("hTS:",tId); const sT=allThemesData.find(t=>t&&t.id===tId); if(!sT){console.error(`Tema ${tId} não encontrado.`);return;} if(sT.subThemes?.length>0){showSubthemeSelectionScreen(sT,elements);}else if(sT.file){loadQuizData(sT.file,elements);}else{console.error(`Tema ${sT.name} inválido.`); const ea=elements.messageArea||elements.themeButtonsContainer;if(ea)showMessage(ea,`Config inválida: ${sT.name}.`,5000);}
}

function handleSubthemeSelection(event, elements) {
    const f=event.currentTarget.dataset.file; console.log("hSTS:",f); if(f){loadQuizData(f,elements);}else{console.error("No data-file."); const ea=elements.messageArea||elements.subthemeButtonsContainer;if(ea)showMessage(ea,`Erro: arquivo não especificado.`,5000);}
}

function shuffleArray(array) { if(!Array.isArray(array))return; for(let i=array.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]];} }

function showQuestionCountSelection(maxQuestions, elements) {
    console.log("sQCS: Max=",maxQuestions); if(!elements.questionCountSelectionContainer){console.error("No #qcs.");showThemeSelectionScreen(elements);return;} if(!elements.questionCountButtonsContainer){console.error("No #qcb.");} showOnly(elements.questionCountSelectionContainer,elements.selectionArea,elements.quizContainer,elements.questionCountSelectionContainer); if(elements.questionCountTitleElement)elements.questionCountTitleElement.textContent=`Quantidade para '${quizConfig.theme||'quiz'}'?`; if(elements.maxQuestionsInfoElement)elements.maxQuestionsInfoElement.textContent=maxQuestions; if(elements.questionCountMessageArea)clearMessage(elements.questionCountMessageArea,true); if(elements.questionCountButtonsContainer){elements.questionCountButtonsContainer.innerHTML=''; const percs=[0.25,0.5,0.75,1.0]; const added=new Set(); percs.forEach(p=>{let c=(p===1.0)?maxQuestions:Math.max(1,Math.round(maxQuestions*p)); c=Math.min(c,maxQuestions); if(c>0&&(!added.has(c)||p===1.0)){added.add(c); const b=document.createElement('button');b.className='control-btn count-btn'; const pTxt=p===1.0?"Todas":`${Math.round(p*100)}%`; b.textContent=`${pTxt} (${c} Questões)`; b.dataset.count=c; b.addEventListener('click',()=>{desiredQuestionCount=parseInt(b.dataset.count);console.log("Num:",desiredQuestionCount);if(elements.questionCountSelectionContainer)elements.questionCountSelectionContainer.classList.add('hide');startGame(elements);}); elements.questionCountButtonsContainer.appendChild(b);}}); } if(elements.backToSelectionFromCountBtn){const oB=elements.backToSelectionFromCountBtn; const nB=oB.cloneNode(true); if(oB.parentNode){oB.parentNode.replaceChild(nB,oB); elements.backToSelectionFromCountBtn=nB; nB.addEventListener('click',()=>{console.log(">>> Voltar (contagem) CLICADO!"); console.log("currentSelectedTheme:",currentSelectedTheme); if(elements.questionCountSelectionContainer)elements.questionCountSelectionContainer.classList.add('hide'); if(currentSelectedTheme?.subThemes?.length>0){console.log("<<< Voltando SUBTEMAS."); showSubthemeSelectionScreen(currentSelectedTheme,elements);}else{console.log("<<< Voltando TEMAS."); showThemeSelectionScreen(elements);}}); console.log("Listener Voltar (contagem) OK.");}else{console.error("Pai Voltar (contagem) não encontrado.");}}else{console.error("#back-to-selection-from-count-btn não encontrado.");}
}

function startGame(elements) {
    console.log("startGame: Iniciando..."); quizJustStarted = true; const eb=document.getElementById('back-to-themes-btn-error'); if(eb)eb.remove(); if(!fullQuizData?.length){console.error("ERRO: start sem fullQuizData.");showThemeSelectionScreen(elements);return;} const max=fullQuizData.length; if(desiredQuestionCount<=0||desiredQuestionCount>max)desiredQuestionCount=max; let qs=[...fullQuizData]; shuffleArray(qs); quizData=qs.slice(0,desiredQuestionCount); if(!quizData?.length){console.error("ERRO: quizData vazio.");showThemeSelectionScreen(elements);return;} console.log(`Iniciando com ${quizData.length} de ${max}.`); showQuizInterface(elements); currentQuestionIndex=0; score=0; isAnswered=false; selectedOptionElement=null; if(elements.messageArea)clearMessage(elements.messageArea); if(elements.quizTitleElement)elements.quizTitleElement.textContent=quizConfig.theme||"Quiz"; if(elements.resultContainer)elements.resultContainer.classList.add('hide'); if(elements.scoreContainer)elements.scoreContainer.classList.add('hide'); if(elements.nextBtn)elements.nextBtn.classList.add('hide');
    // Garante que #finish-btn comece escondido
    if(elements.finishBtn)elements.finishBtn.classList.add('hide');
    if(elements.confirmBtn){elements.confirmBtn.classList.remove('hide');elements.confirmBtn.disabled=true;} else console.error("ConfirmBtn não encontrado!"); if(elements.quizBackBtn)elements.quizBackBtn.classList.remove('hide'); else console.warn("#quiz-back-btn não encontrado."); if(elements.quizMainMenuBtn)elements.quizMainMenuBtn.classList.remove('hide'); else console.warn("#quiz-main-menu-btn não encontrado.");
    showQuestion(quizData[currentQuestionIndex],elements); // Chama showQuestion que já reseta os cards
    saveGameState(); // Salva estado inicial
}

function updateProgressBar(elements) { if(!quizData||!elements.progressBarIndicator||!elements.progressTextElement)return; const t=quizData.length; const c=currentQuestionIndex+1; if(t===0){elements.progressBarIndicator.style.width='0%';elements.progressTextElement.textContent='0/0';return;} const p=Math.min((c/t)*100,100); elements.progressBarIndicator.style.width=`${p}%`; elements.progressTextElement.textContent=`Questão ${c} de ${t}`; }

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
         }
         const frontFace = frame.querySelector('.front-face');
          if (frontFace) {
             frontFace.style.display = ''; // Garante que não esteja 'none'
         }
     });
     // Esconde e reseta posição do botão Fechar Detalhes externo se existir
     if (elements.expandedCardControlsContainer) {
        elements.expandedCardControlsContainer.classList.add('hide');
        elements.expandedCardControlsContainer.style.top = ''; // <<< Limpa o estilo top inline
        console.log("resetCardStates: Container do botão Fechar externo oculto e top resetado.");
     }
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
        console.log("resetExpandedState: Classe 'expanded-correct' removida.");

    } else {
        console.log("resetExpandedState: Nenhum card com .expanded-correct encontrado.");
    }

    // Esconde e reseta posição do botão "Fechar Detalhes" externo
    if (elements.expandedCardControlsContainer) {
        elements.expandedCardControlsContainer.classList.add('hide');
        elements.expandedCardControlsContainer.style.top = ''; // <<< Limpa o estilo top inline
        console.log("resetExpandedState: Container do botão Fechar externo oculto e top resetado.");
    } else {
         console.warn("resetExpandedState: elements.expandedCardControlsContainer não encontrado.");
    }
}


// Função para mostrar todos os cards revelados e botões de controle (MODIFICADA)
function revealGridState(elements) {
    if (!elements || !elements.answerOptionsElement) {
        console.error("revealGridState: Elementos inválidos recebidos.");
        return;
    }
    console.log("revealGridState: Iniciando revelação da grade...");

    let framesFound = 0;
    elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(frame => {
        framesFound++;
        frame.classList.remove('expanded-correct', 'sibling-of-expanded');
        frame.classList.add('revealed');
        console.log(`revealGridState: Classe 'revealed' adicionada ao frame:`, frame.dataset.optionText);
        frame.classList.add('disabled');
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


function showQuestion(questionData, elements) {
    resetCardStates(elements);
    console.log(`showQ: Idx ${currentQuestionIndex}`);
    isAnswered = false; selectedOptionElement = null;
    if (elements.confirmBtn) {
        elements.confirmBtn.classList.remove('confirm-active');
        elements.confirmBtn.disabled = true;
        elements.confirmBtn.classList.remove('hide');
    }
    if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    if(elements.finishBtn) elements.finishBtn.classList.add('hide'); // Garante que Finalizar comece escondido

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
        const bF = document.createElement('div'); bF.className = 'back-face';

        if (opt.isCorrect === true && opt.imageUrl) {
            const imgContainer = document.createElement('div'); imgContainer.className = 'option-image-container';
            const imgEl = document.createElement('img'); imgEl.src = opt.imageUrl; imgEl.alt = opt.text; imgEl.className = 'option-image'; imgEl.loading = 'lazy';
            imgContainer.appendChild(imgEl);
            bF.appendChild(imgContainer);
        }

        const eS = document.createElement('span'); eS.className = 'explanation';
        eS.textContent = opt.explanation || 'Sem explicação.';
        bF.appendChild(eS);

        oF.appendChild(fF); oF.appendChild(bF);
        oF.addEventListener('click', (e) => selectAnswer(e, elements));
        if (elements.answerOptionsElement) elements.answerOptionsElement.appendChild(oF);
    });

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
    if(isAnswered)return;
    if(elements.messageArea)clearMessage(elements.messageArea);
    const clickedFrame=event.currentTarget; if(!clickedFrame)return;

    if(elements.answerOptionsElement)elements.answerOptionsElement.querySelectorAll('.option-frame').forEach(f=>{
        if(f!==clickedFrame)f.classList.remove('selected');
    });
    clickedFrame.classList.toggle('selected');

    if(clickedFrame.classList.contains('selected')){
        selectedOptionElement=clickedFrame;
        if(elements.confirmBtn){elements.confirmBtn.disabled=false; elements.confirmBtn.classList.add('confirm-active');}
    }else{
        selectedOptionElement=null;
        if(elements.confirmBtn){elements.confirmBtn.disabled=true; elements.confirmBtn.classList.remove('confirm-active');}
    }
}

function confirmAnswer(elements) {
    console.log('confirmAnswer: Iniciando...');
    if (!selectedOptionElement) {
        if (elements.messageArea) showMessage(elements.messageArea, "Selecione uma opção.", 3000);
        return;
    }
    if (isAnswered) {
        console.warn('confirmAnswer: Já respondido.');
        return;
    }
    isAnswered = true;
    quizJustStarted = false;
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
        if (isCorrect) score++;

        const allFrames = elements.answerOptionsElement ? Array.from(elements.answerOptionsElement.querySelectorAll('.option-frame')) : [];
        let correctFrame = null;

        console.log('confirmAnswer: Marcando cards disabled e cores...');
        allFrames.forEach(f => {
             if (!(f instanceof HTMLElement)) return;
             const fTxt = f.dataset.optionText;
             if (typeof fTxt === 'undefined') return;
             const oData = opts.find(o => o?.text === fTxt);
             f.classList.add('disabled');
             const backFace = f.querySelector('.back-face');
             if (backFace && oData) {
                 backFace.classList.toggle('correct', oData.isCorrect === true);
                 backFace.classList.toggle('incorrect', oData.isCorrect !== true);
                 if (oData.isCorrect) {
                     correctFrame = f;
                 }
             } else if (backFace) {
                 backFace.classList.add('incorrect');
             }
             if (f === selectedOptionElement) {
                 f.style.outline = '3px solid #333'; f.style.outlineOffset = '2px';
             } else {
                 f.style.outline = 'none';
             }
        });
        console.log('confirmAnswer: Cores e disabled aplicados.');

        updateScoreDisplay(elements);
        saveGameState();
        if (elements.scoreContainer) elements.scoreContainer.classList.remove('hide');

        if (isCorrect) {
            console.log('confirmAnswer: Resposta CORRETA. Iniciando expansão...');
            if (correctFrame) {
                 requestAnimationFrame(() => {
                     requestAnimationFrame(() => {
                        console.log('confirmAnswer: Aplicando classe expanded-correct.');
                        correctFrame.classList.add('expanded-correct');
                        correctFrame.style.zIndex = 1000;

                        const animationDuration = 800;
                        setTimeout(() => {
                            if (elements.expandedCardControlsContainer && correctFrame.classList.contains('expanded-correct')) {
                                const cardRect = correctFrame.getBoundingClientRect();
                                const buttonHeight = elements.closeExpandedCardBtn.offsetHeight || 40;
                                const desiredSpacing = 15;
                                const buttonTop = cardRect.bottom + desiredSpacing;
                                const maxTop = window.innerHeight - buttonHeight - 10;
                                const finalTop = Math.min(buttonTop, maxTop);
                                console.log(`Posicionando botão Fechar: card bottom=${cardRect.bottom}, botão top=${finalTop}`);
                                elements.expandedCardControlsContainer.style.top = `${finalTop}px`;
                                elements.expandedCardControlsContainer.classList.remove('hide');
                            } else {
                                console.warn("Timeout: Card não está mais expandido ou container do botão não encontrado.")
                            }
                        }, animationDuration);
                    });
                });
            } else {
                 console.error("confirmAnswer: Resposta correta, mas card correto não identificado! Revelando grade.");
                 revealGridState(elements);
            }
        } else {
            console.log('confirmAnswer: Resposta INCORRETA. Revelando grade diretamente.');
             setTimeout(() => {
                 revealGridState(elements);
            }, 300);
        }

    } catch(err) {
        console.error("ERRO em confirmAnswer:", err);
        if(elements.messageArea)showMessage(elements.messageArea,`Erro: ${err.message}.`,6000);
        resetCardStates(elements);
        if(elements.finishBtn)elements.finishBtn.classList.add('hide');
        if(elements.nextBtn)elements.nextBtn.classList.add('hide');
    }
}


function nextQuestion(elements) {
    console.log("nextQuestion", currentQuestionIndex);
    currentQuestionIndex++;
    if(currentQuestionIndex < quizData.length){
        showQuestion(quizData[currentQuestionIndex], elements);
    } else {
        showResults(elements);
    }
}

function showResults(elements) {
    clearGameState();
    console.log("showResults");
    if (elements.quizContainer) resetCardStates(elements);
    if(elements.quizBackBtn)elements.quizBackBtn.classList.add('hide');
    if(elements.quizMainMenuBtn)elements.quizMainMenuBtn.classList.add('hide');
    showOnly(elements.quizContainer,elements.selectionArea,elements.quizContainer,elements.questionCountSelectionContainer);
    if(elements.questionContainer)elements.questionContainer.classList.add('hide');
    if(elements.progressContainer)elements.progressContainer.classList.add('hide');
    if(elements.controlsContainer)elements.controlsContainer.classList.add('hide');
    if(elements.messageArea)clearMessage(elements.messageArea);
    if(!elements.resultContainer){console.error("No result container!");if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide');updateScoreDisplay(elements);return;}
    elements.resultContainer.classList.remove('hide');
    if(elements.scoreContainer)elements.scoreContainer.classList.remove('hide');
    const finalScore=calculateFinalScoreString(); const totalQ=quizData.length;
    elements.resultContainer.innerHTML=`<h2>Quiz '${quizConfig.theme||'Quiz'}' Finalizado!</h2><p>Acertos: <strong>${score}</strong> de <strong>${totalQ}</strong>.</p><p>Pontuação: <strong>${finalScore}</strong></p><button id="choose-another-theme-btn" class="control-btn back-btn" style="background-color:#007bff;color:white;">Jogar Novamente</button>`;
    const btn=document.getElementById('choose-another-theme-btn'); if(btn){btn.addEventListener('click',()=>{if(elements.resultContainer)elements.resultContainer.classList.add('hide'); if(elements.scoreContainer)elements.scoreContainer.classList.add('hide'); showThemeSelectionScreen(elements);});}else console.error("#choose-another-theme-btn não encontrado.");
    updateScoreDisplay(elements);
}

function updateScoreDisplay(elements) { console.log("updateScoreDisplay"); if(!elements.scoreContainer||!elements.pointsDisplayContainer||!elements.percentageDisplayContainer||!elements.scoreValueElement||!elements.scorePercentageElement){console.error("Score elements missing.");return;} if(!quizConfig?.scoring){console.warn("Scoring config missing.");elements.pointsDisplayContainer.classList.add('hide');elements.percentageDisplayContainer.classList.add('hide');elements.scoreContainer.classList.remove('hide');return;} const scoreStr=calculateFinalScoreString(); if(scoreStr==="Erro"||scoreStr==="N/A"){console.warn("Invalid score string.");elements.scoreValueElement.textContent="...";elements.scorePercentageElement.textContent="...";elements.pointsDisplayContainer.classList.add('hide');elements.percentageDisplayContainer.classList.add('hide');elements.scoreContainer.classList.remove('hide');return;} const isPerc=quizConfig.scoring==="percentage"; if(isPerc){elements.scorePercentageElement.textContent=scoreStr.replace('%','');elements.percentageDisplayContainer.classList.remove('hide');elements.pointsDisplayContainer.classList.add('hide');}else{const val=scoreStr.split(' ')[0];elements.scoreValueElement.textContent=val;elements.pointsDisplayContainer.classList.remove('hide');elements.percentageDisplayContainer.classList.add('hide');} elements.scoreContainer.classList.remove('hide'); }

function calculateFinalScoreString() { console.log("calcFinalScoreString"); if(!quizConfig?.scoring||!quizData){return"N/A";} const numQ=quizData.length; if(numQ===0)return"0"; if(typeof score!=='number'||isNaN(score))return"Erro"; let scoreStr="Erro"; try{if(quizConfig.scoring==="percentage"){scoreStr=`${Math.round((score/numQ)*100)}%`;}else{const totPts=quizConfig.totalPoints; const origQ=fullQuizData?.length||quizData.length; let currVal; let totStr=''; if(totPts&&typeof totPts==='number'&&totPts>0&&origQ>0){currVal=Math.round(score*(totPts/origQ));totStr=` / ${totPts}`;}else{currVal=score;totStr=` / ${numQ}`;} const unit= " ponto"+(currVal!==1?"s":""); scoreStr=`${currVal}${totStr}${unit}`;}}catch(e){console.error("Erro calc score:",e);scoreStr="Erro";} return scoreStr; }

function showMessage(messageAreaElement, message, duration = 3000, isError = true, useSpecificTimeout = false) { if(!(messageAreaElement instanceof Element)){console.warn("showMessage: Elem inválido.");return;} let timeoutVar=useSpecificTimeout?countMessageTimeout:messageTimeout; const setter=(nT)=>{if(useSpecificTimeout)countMessageTimeout=nT;else messageTimeout=nT;}; if(timeoutVar){clearTimeout(timeoutVar);setter(null);} messageAreaElement.textContent=message; messageAreaElement.className='message-area'; messageAreaElement.classList.add(isError?'error':'success'); messageAreaElement.classList.remove('hide'); const nTID=setTimeout(()=>{messageAreaElement.classList.add('hide');messageAreaElement.textContent='';messageAreaElement.classList.remove('error','success');setter(null);},duration); setter(nTID); }

function clearMessage(messageAreaElement, useSpecificTimeout = false) { if(!(messageAreaElement instanceof Element))return; let timeoutVar=useSpecificTimeout?countMessageTimeout:messageTimeout; const setter=(nT)=>{if(useSpecificTimeout)countMessageTimeout=nT;else messageTimeout=nT;}; if(timeoutVar){clearTimeout(timeoutVar);setter(null);} messageAreaElement.classList.add('hide'); messageAreaElement.textContent=''; messageAreaElement.classList.remove('error','success'); }

// --- Inicialização DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Configurando interface...");

    // Element Retrieval (removido endQuizEarlyBtn)
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
        scorePercentageElement: document.getElementById('score-percentage'),
        pointsDisplayContainer: document.getElementById('points-score-display'),
        percentageDisplayContainer: document.getElementById('percentage-score-display'),
        resultContainer: document.getElementById('result-container'),
        resumePromptContainer: document.getElementById('resume-prompt'),
        resumeYesBtn: document.getElementById('resume-yes-btn'),
        resumeNoBtn: document.getElementById('resume-no-btn'),
        expandedCardControlsContainer: document.getElementById('expanded-card-controls'),
        closeExpandedCardBtn: document.getElementById('close-expanded-card-btn'),
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

        if(newYesBtn) {
            newYesBtn.onclick = () => {
                elements.resumePromptContainer.classList.add('hide');
                resumeGame(savedState, elements);
            };
        } else { console.error("#resume-yes-btn não encontrado após clonagem"); }

        if(newNoBtn) {
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
    if (elements.quizBackBtn) { elements.quizBackBtn.addEventListener('click', () => {
        console.log("Voltar (quiz->contagem/temas) clicado.");
        clearGameState();
        if (window.quizFilePath && fullQuizData && fullQuizData.length > 0 && elements.questionCountSelectionContainer) {
             showQuestionCountSelection(fullQuizData.length, elements);
        } else {
             showThemeSelectionScreen(elements);
        }
     });
    } else console.warn("#quiz-back-btn não encontrado ou removido intencionalmente.");

    if (elements.quizMainMenuBtn) { elements.quizMainMenuBtn.addEventListener('click', () => { console.log("Menu Principal (quiz) clicado."); showThemeSelectionScreen(elements); }); } else console.warn("#quiz-main-menu-btn não encontrado ou removido intencionalmente.");

    if (elements.confirmBtn) elements.confirmBtn.addEventListener('click', () => confirmAnswer(elements)); else console.error("#confirm-btn não encontrado!");
    if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => nextQuestion(elements)); else console.warn("#next-btn não encontrado.");

    // Listener para #finish-btn (com confirmação)
    if (elements.finishBtn) {
        const newFinishBtn = elements.finishBtn.cloneNode(true);
        elements.finishBtn.parentNode.replaceChild(newFinishBtn, elements.finishBtn);
        elements.finishBtn = newFinishBtn;

        elements.finishBtn.addEventListener('click', () => {
            console.log("'Finalizar Quiz' clicado.");
            const currentScoreString = calculateFinalScoreString();
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

    // Listener para #close-expanded-card-btn
    if (elements.closeExpandedCardBtn) {
        elements.closeExpandedCardBtn.addEventListener('click', () => {
            console.log("Botão Fechar Detalhes clicado!");
            try {
                resetExpandedState(elements);
                revealGridState(elements);
            } catch (e) {
                 console.error("Erro ao clicar no botão Fechar Detalhes:", e);
            }
        });
        console.log("Listener para #close-expanded-card-btn adicionado.");
    } else {
        console.error("#close-expanded-card-btn não encontrado no DOM.");
    }

    const now = new Date(); let options = { hour12: false, timeZone: 'America/Sao_Paulo' }; try { options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) {} console.log(`Interface JS pronta: ${now.toLocaleString('pt-BR', options)} (${options.timeZone})`);
});