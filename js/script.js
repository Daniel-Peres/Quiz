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

// Função auxiliar para mostrar/esconder elementos principais
// VERSÃO ATUALIZADA: Sempre recebe 4 argumentos para consistência
function showOnly(elementToShow, selectionArea, quizContainer, questionCountSelection) {
    console.log("showOnly called. Showing:", elementToShow ? elementToShow.id : 'null', " Hiding others.");
    if (selectionArea) selectionArea.classList.add('hide');
    if (quizContainer) quizContainer.classList.add('hide');
    if (questionCountSelection) questionCountSelection.classList.add('hide'); // Esconde a seção de contagem também
    if (elementToShow) elementToShow.classList.remove('hide');
}

// Mostra a tela de seleção de temas
function showThemeSelectionScreen(elements) {
    console.log("showThemeSelectionScreen");
    currentSelectedTheme = null; // Limpa tema selecionado ao voltar aqui
    // Chamada ATUALIZADA para showOnly
    showOnly(elements.selectionArea, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');
    if (elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
    if (elements.themeButtonsContainer) {
        elements.themeButtonsContainer.innerHTML = '<p>Carregando temas...</p>'; // Mensagem de carregamento
        loadThemes(elements); // Carrega temas
    } else {
        console.error("Elemento themeButtonsContainer não encontrado!");
    }
}

// Mostra a tela de seleção de subtemas
function showSubthemeSelectionScreen(theme, elements) {
    currentSelectedTheme = theme; // Guarda o tema pai
    console.log("showSubthemeSelectionScreen for theme:", theme.name);
    // Esconde a seleção principal de temas
    if (elements.themeSelectionContainer) elements.themeSelectionContainer.classList.add('hide');

    if (elements.subthemeTitleElement) {
        elements.subthemeTitleElement.textContent = `Escolha um Subtema para: ${theme.name}`;
    } else { console.warn("subthemeTitleElement não encontrado"); }

    populateSubthemeButtons(theme.subThemes, elements); // Preenche botões de subtema

    // Mostra o container de subtemas
    if (elements.subthemeSelectionContainer) {
        elements.subthemeSelectionContainer.classList.remove('hide');
    } else { console.error("subthemeSelectionContainer não encontrado!"); }
}


// Mostra a interface principal do Quiz (após seleção de quantidade)
function showQuizInterface(elements) {
    console.log("showQuizInterface");
    // Chamada ATUALIZADA para showOnly
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);

    // Reseta e mostra elementos do quiz
    if (elements.progressBarIndicator) elements.progressBarIndicator.style.width = '0%';
    else { console.warn("progressBarIndicator não encontrado"); }
    if (elements.progressTextElement) elements.progressTextElement.textContent = 'Carregando...';
    else { console.warn("progressTextElement não encontrado"); }

    // Mostra os containers do quiz que podem ter sido escondidos
    if (elements.progressContainer) elements.progressContainer.classList.remove('hide');
    else { console.warn("progressContainer não encontrado"); }
    if (elements.questionContainer) elements.questionContainer.classList.remove('hide');
    else { console.warn("questionContainer não encontrado"); }
    if (elements.controlsContainer) elements.controlsContainer.classList.remove('hide');
    else { console.warn("controlsContainer não encontrado"); }
}


// Carrega os temas do themes.json
async function loadThemes(elements) {
    console.log('loadThemes: Iniciando busca...');
    try {
        const response = await fetch('data/themes.json'); // Assume pasta 'data'
        if (!response.ok) throw new Error(`Erro HTTP ${response.status} ao buscar themes.json`);
        allThemesData = await response.json();
        if (!Array.isArray(allThemesData)) throw new Error("Formato inválido de themes.json (não é um array).");
        console.log('loadThemes: Dados parseados:', allThemesData);
        populateThemeButtons(allThemesData, elements);
    } catch (error) {
        console.error("Falha CRÍTICA ao carregar themes.json:", error);
        if (elements.themeButtonsContainer) {
             elements.themeButtonsContainer.innerHTML = `<p style="color: red;">Erro ao carregar temas: ${error.message}. Verifique o console (F12).</p>`;
        }
    }
}

// Preenche os botões de tema
function populateThemeButtons(themes, elements) {
    console.log('populateThemeButtons');
    if (!elements.themeButtonsContainer) {
        console.error("themeButtonsContainer não existe para popular botões de tema.");
        return;
    }
    elements.themeButtonsContainer.innerHTML = ''; // Limpa container
    if (!themes || themes.length === 0) {
        elements.themeButtonsContainer.innerHTML = '<p>Nenhum tema encontrado no arquivo.</p>';
        return;
    }
    themes.forEach(theme => {
        if (!theme || !theme.id || !theme.name) {
             console.warn("Tema inválido (sem id ou nome) encontrado:", theme);
             return; // Pula tema inválido
        }
        const button = document.createElement('button');
        button.className = 'theme-btn';
        button.dataset.themeId = theme.id;
        let buttonHTML = `<strong>${theme.name}</strong>`;
        if (theme.description) buttonHTML += `<span class="description">${theme.description}</span>`;
        button.innerHTML = buttonHTML;
        button.addEventListener('click', (event) => handleThemeSelection(event, elements));
        elements.themeButtonsContainer.appendChild(button);
    });
}

// Preenche os botões de subtema
function populateSubthemeButtons(subThemes, elements) {
     console.log('populateSubthemeButtons');
     if (!elements.subthemeButtonsContainer) {
        console.error("subthemeButtonsContainer não existe para popular botões de subtema.");
        return;
     }
     elements.subthemeButtonsContainer.innerHTML = ''; // Limpa
     if (!subThemes || !Array.isArray(subThemes) || subThemes.length === 0) {
         elements.subthemeButtonsContainer.innerHTML = '<p>Nenhum subtema encontrado para este tema.</p>';
         return;
     }
     subThemes.forEach(subTheme => {
         if(!subTheme || !subTheme.file || !subTheme.name) {
             console.warn("Subtema inválido (sem file ou nome):", subTheme);
             return; // Pula subtema inválido
         }
         const button = document.createElement('button');
         button.className = 'theme-btn'; // Reutiliza estilo
         button.dataset.file = subTheme.file; // Guarda o caminho do arquivo
         let buttonHTML = `<strong>${subTheme.name}</strong>`;
         if (subTheme.description) buttonHTML += `<span class="description">${subTheme.description}</span>`;
         button.innerHTML = buttonHTML;
         button.addEventListener('click', (event) => handleSubthemeSelection(event, elements));
         elements.subthemeButtonsContainer.appendChild(button);
     });
}

// Carrega os dados do JSON do quiz selecionado (REVISADO)
async function loadQuizData(filename, elements) {
    console.log(`Iniciando carregamento do quiz: ${filename}`);

    // Limpa estado anterior e mostra carregamento
    fullQuizData = []; // Limpa dados antigos
    quizConfig = {};
    desiredQuestionCount = 0;
    // Esconde todas as seções principais
    showOnly(null, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);

    // Mostra mensagem de carregamento (mais robusto)
    let loadingMsgElement = document.getElementById('loading-quiz-msg');
    if (!loadingMsgElement && elements.mainContainer) {
        loadingMsgElement = document.createElement('p');
        loadingMsgElement.id = 'loading-quiz-msg';
        loadingMsgElement.textContent = 'Carregando dados do quiz...';
        loadingMsgElement.style.textAlign = 'center';
        loadingMsgElement.style.padding = '20px';
        elements.mainContainer.appendChild(loadingMsgElement);
    } else if (loadingMsgElement) {
         loadingMsgElement.textContent = 'Carregando dados do quiz...';
         loadingMsgElement.style.color = 'inherit'; // Reseta cor caso tenha sido erro antes
         loadingMsgElement.classList.remove('hide');
    }

    // Remove botão de erro anterior, se existir
    const errorBackButton = document.getElementById('back-to-themes-btn-error');
    if (errorBackButton) errorBackButton.remove();

    try {
        console.log(`Buscando arquivo em: data/${filename}`);
        const response = await fetch(`data/${filename}`); // Assume pasta 'data'
        if (!response.ok) {
            throw new Error(`Falha ao buscar '${filename}' (Status: ${response.status})`);
        }
        const jsonData = await response.json();

        // Validação mais rigorosa do JSON
        if (!jsonData || typeof jsonData !== 'object') throw new Error("Arquivo JSON vazio ou inválido.");
        if (!jsonData.config || typeof jsonData.config !== 'object') throw new Error("Configuração ('config') ausente ou inválida no JSON.");
        if (!jsonData.data || !Array.isArray(jsonData.data)) throw new Error("Dados das questões ('data') ausentes ou inválidos (não é um array) no JSON.");
        if (jsonData.data.length === 0) throw new Error("Arquivo JSON não contém questões (array 'data' está vazio).");

        // Armazena os dados carregados
        fullQuizData = jsonData.data;
        quizConfig = jsonData.config;
        console.log(`Quiz '${quizConfig.theme || 'Sem Título'}' pré-carregado com ${fullQuizData.length} questões.`);

        // Esconde/Remove mensagem de carregamento
        if (loadingMsgElement) loadingMsgElement.classList.add('hide');

        // Chama a seleção de quantidade
        showQuestionCountSelection(fullQuizData.length, elements);

    } catch (error) {
        console.error("Falha CRÍTICA ao carregar ou processar dados do quiz:", filename, error);

        // Mostra erro de forma mais proeminente
        if (loadingMsgElement) {
            loadingMsgElement.textContent = `Erro ao carregar o quiz '${filename}': ${error.message}. Verifique o console (F12) e o arquivo JSON.`;
            loadingMsgElement.style.color = 'red';
            loadingMsgElement.classList.remove('hide');
        } else if (elements.mainContainer) {
             // Se a mensagem de loading não existia, adiciona uma de erro
             elements.mainContainer.innerHTML = `<p id="loading-quiz-msg" style="color: red; text-align: center; padding: 20px;">Erro ao carregar o quiz '${filename}': ${error.message}. Verifique o console (F12) e o arquivo JSON.</p>`;
             loadingMsgElement = document.getElementById('loading-quiz-msg'); // Pega a referência recém criada
        }

         // Adiciona botão voltar mesmo em caso de erro
         if (loadingMsgElement && !document.getElementById('back-to-themes-btn-error')) {
            const backButton = document.createElement('button');
            backButton.textContent = 'Voltar à Seleção de Temas';
            backButton.id = 'back-to-themes-btn-error';
            backButton.className = 'control-btn back-btn';
            backButton.style.marginTop = '20px';
            backButton.style.display = 'block'; // Garante visibilidade
             backButton.style.marginLeft = 'auto';
             backButton.style.marginRight = 'auto';
            backButton.onclick = () => showThemeSelectionScreen(elements);
             // Adiciona após a mensagem de erro
             loadingMsgElement.parentNode.insertBefore(backButton, loadingMsgElement.nextSibling);
         }
         // Garante que outras seções do quiz permaneçam escondidas
         if(elements.quizContainer) elements.quizContainer.classList.add('hide');
         if(elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
    }
}


// Lida com a seleção de um tema principal
function handleThemeSelection(event, elements) {
    const themeId = event.currentTarget.dataset.themeId;
    console.log("handleThemeSelection: ID =", themeId);
    const selectedTheme = allThemesData.find(theme => theme && theme.id === themeId); // Adicionado check se theme existe
    if (!selectedTheme) {
        console.error(`Tema com ID '${themeId}' não encontrado em allThemesData.`);
        // Considerar mostrar mensagem para o usuário aqui
        return;
    }
    // Verifica se tem subtemas VÁLIDOS
    if (selectedTheme.subThemes && Array.isArray(selectedTheme.subThemes) && selectedTheme.subThemes.length > 0) {
        console.log(`Tema '${selectedTheme.name}' tem subtemas. Mostrando seleção de subtema.`);
        showSubthemeSelectionScreen(selectedTheme, elements);
    } else if (selectedTheme.file) {
        console.log(`Tema '${selectedTheme.name}' tem arquivo direto: ${selectedTheme.file}. Carregando quiz.`);
        loadQuizData(selectedTheme.file, elements); // Leva à seleção de quantidade
    } else {
        console.error(`Tema '${selectedTheme.name}' (ID: ${themeId}) é inválido: não tem subtemas nem 'file'.`);
        // Mostrar mensagem ao usuário
        const errorArea = elements.messageArea || document.getElementById('message-area') || elements.themeButtonsContainer;
        if (errorArea) showMessage(errorArea, `Configuração inválida para o tema '${selectedTheme.name}'.`, 5000);
    }
}

// Lida com a seleção de um subtema
function handleSubthemeSelection(event, elements) {
    const filename = event.currentTarget.dataset.file;
    console.log("handleSubthemeSelection: file =", filename);
    if (filename) {
        loadQuizData(filename, elements); // Leva à seleção de quantidade
    } else {
        console.error("Subtema selecionado não possui atributo 'data-file'.");
        // Mostrar mensagem ao usuário
        const errorArea = elements.messageArea || document.getElementById('message-area') || elements.subthemeButtonsContainer;
        if (errorArea) showMessage(errorArea, `Erro ao carregar subtema: arquivo não especificado.`, 5000);
    }
}

// *** INÍCIO: SEÇÃO DE SELEÇÃO DE QUANTIDADE (REVISADA) ***

// Função auxiliar para embaralhar um array (Fisher-Yates shuffle)
function shuffleArray(array) {
    if (!Array.isArray(array)) return; // Só embaralha arrays
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Mostra a seção para escolher o número de questões (REVISADA)
function showQuestionCountSelection(maxQuestions, elements) {
    console.log("showQuestionCountSelection: Max questões =", maxQuestions);

    // Verifica elemento principal da seção
    if (!elements.questionCountSelectionContainer) {
        console.error("CRITICAL: Elemento #question-count-selection não encontrado. Impossível mostrar seleção.");
        showThemeSelectionScreen(elements); // Tenta voltar para seleção de temas
        // Adiciona mensagem de erro global se possível
         const errorArea = elements.messageArea || document.getElementById('message-area') || elements.mainContainer;
        if(errorArea) showMessage(errorArea, "Erro interno: Não foi possível exibir a tela de seleção de quantidade.", 5000);
        return;
    }

    // Mostra a seção correta
    showOnly(elements.questionCountSelectionContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);

    // Atualiza textos e input (com verificações)
    if (elements.questionCountTitleElement) elements.questionCountTitleElement.textContent = `Quantas questões para '${quizConfig.theme || 'este quiz'}'?`;
    else { console.warn("questionCountTitleElement não encontrado"); }

    if (elements.maxQuestionsInfoElement) elements.maxQuestionsInfoElement.textContent = maxQuestions;
    else { console.warn("maxQuestionsInfoElement não encontrado"); }

    if (elements.maxQuestionsLabelElement) elements.maxQuestionsLabelElement.textContent = maxQuestions;
    else { console.warn("maxQuestionsLabelElement não encontrado"); }

    if (elements.questionCountInputElement) {
        elements.questionCountInputElement.max = maxQuestions;
        elements.questionCountInputElement.min = 1; // Garante min 1
        // Define valor padrão (ex: 10 ou max, o que for menor, mas não menos que 1)
        elements.questionCountInputElement.value = Math.max(1, Math.min(10, maxQuestions));
    } else { console.error("questionCountInputElement não encontrado!"); }

    // Limpa mensagens de erro anteriores nesta seção
    if (elements.questionCountMessageArea) clearMessage(elements.questionCountMessageArea, true); // Passa true para limpar timeout específico
    else { console.warn("questionCountMessageArea não encontrado"); }


    // --- Configuração dos Botões (com mais cuidado) ---

    // Botão "Iniciar Quiz"
    if (elements.startQuizWithCountBtn) {
         // Usar cloneNode para garantir que listeners antigos sejam removidos
         const oldBtn = elements.startQuizWithCountBtn;
         const newBtn = oldBtn.cloneNode(true); // Cria um clone limpo

         if (oldBtn.parentNode) {
             oldBtn.parentNode.replaceChild(newBtn, oldBtn); // Substitui o botão antigo pelo clone
             elements.startQuizWithCountBtn = newBtn; // ATUALIZA A REFERÊNCIA no objeto elements

             // Adiciona o listener de clique ao NOVO botão
             newBtn.addEventListener('click', () => {
                 console.log("Botão 'Iniciar Quiz com Contagem' clicado.");
                 // Re-busca os elementos caso a referência tenha mudado (embora elements seja atualizado)
                 const countInput = document.getElementById('question-count-input');
                 const messageArea = document.getElementById('question-count-message');

                 if (!countInput || !messageArea) {
                     console.error("Input de contagem ou área de mensagem não encontrados ao clicar em Iniciar.");
                     showMessage(document.body, "Erro interno (elementos não encontrados).", 5000);
                     return;
                 }

                 const count = parseInt(countInput.value);
                 const currentMax = parseInt(countInput.max);

                 // Validação
                 if (isNaN(count) || count < 1 || count > currentMax) {
                     showMessage(messageArea, `Por favor, insira um número válido entre 1 e ${currentMax}.`, 4000, true, true); // isError=true, useCountTimeout=true
                 } else {
                     desiredQuestionCount = count; // Guarda a quantidade
                     console.log("Número de questões selecionado:", desiredQuestionCount);
                     if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
                     startGame(elements); // Inicia o jogo
                 }
             });
              console.log("Listener adicionado ao botão 'start-quiz-with-count-btn'");

         } else {
              console.error("Não foi possível configurar o botão 'Iniciar Quiz com Contagem' pois seu elemento pai não foi encontrado no DOM.");
         }
    } else {
        console.error("Botão #start-quiz-with-count-btn não encontrado em 'elements'.");
    }

    // Botão "Voltar" (desta seção para a seleção anterior)
    if (elements.backToSelectionFromCountBtn) {
        // Também usar cloneNode para segurança
        const oldBackBtn = elements.backToSelectionFromCountBtn;
        const newBackBtn = oldBackBtn.cloneNode(true);

        if(oldBackBtn.parentNode){
            oldBackBtn.parentNode.replaceChild(newBackBtn, oldBackBtn);
            elements.backToSelectionFromCountBtn = newBackBtn; // Atualiza referência

            newBackBtn.addEventListener('click', () => {
                 console.log("Botão 'Voltar' (da seleção de contagem) clicado.");
                 if (elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
                 // Decide se volta para subtemas ou temas
                 if (currentSelectedTheme && currentSelectedTheme.subThemes && currentSelectedTheme.subThemes.length > 0) {
                     console.log("Voltando para seleção de subtemas.");
                     showSubthemeSelectionScreen(currentSelectedTheme, elements);
                 } else {
                     console.log("Voltando para seleção de temas principal.");
                     showThemeSelectionScreen(elements);
                 }
            });
             console.log("Listener adicionado ao botão 'back-to-selection-from-count-btn'");
        } else {
             console.error("Não foi possível configurar o botão 'Voltar' (da seleção de contagem) pois seu elemento pai não foi encontrado no DOM.");
        }
    } else {
        console.error("Botão #back-to-selection-from-count-btn não encontrado em 'elements'.");
    }
}


// Inicia o jogo (REVISADO para mais robustez)
function startGame(elements) {
    console.log("startGame: Iniciando...");

    // Limpa botão de erro de carregamento anterior
    const errorBackButton = document.getElementById('back-to-themes-btn-error');
    if (errorBackButton) errorBackButton.remove();

    // --- Preparação das Questões ---
    if (!fullQuizData || !Array.isArray(fullQuizData) || fullQuizData.length === 0) {
        console.error("startGame: ERRO FATAL - Tentando iniciar o jogo sem dados carregados (fullQuizData vazio).");
        showThemeSelectionScreen(elements); // Volta para seleção
        const errorArea = elements.messageArea || document.getElementById('message-area') || elements.mainContainer;
        if(errorArea) showMessage(errorArea, "Erro crítico: Dados do quiz não estão disponíveis. Selecione um tema novamente.", 8000);
        return;
    }

    // Valida a contagem desejada
    const maxAvailable = fullQuizData.length;
    if (desiredQuestionCount <= 0 || desiredQuestionCount > maxAvailable) {
         console.warn(`startGame: Contagem desejada (${desiredQuestionCount}) é inválida ou maior que o disponível (${maxAvailable}). Usando todas as ${maxAvailable} questões.`);
         desiredQuestionCount = maxAvailable;
    }

    // Cria cópia para não modificar fullQuizData original permanentemente com o shuffle
    let questionsToShuffle = [...fullQuizData];
    shuffleArray(questionsToShuffle); // Embaralha a cópia

    // Seleciona o número desejado de questões da lista embaralhada
    quizData = questionsToShuffle.slice(0, desiredQuestionCount);
    console.log(`startGame: Jogo iniciado com ${quizData.length} questões selecionadas aleatoriamente (de ${maxAvailable} disponíveis).`);

    // Verifica se, após tudo, temos questões para jogar
    if (!quizData || quizData.length === 0) {
         console.error("startGame: ERRO FATAL - Nenhuma questão selecionada para o quiz (quizData vazio).");
         showThemeSelectionScreen(elements);
         const errorArea = elements.messageArea || document.getElementById('message-area') || elements.mainContainer;
         if(errorArea) showMessage(errorArea, "Erro crítico: Nenhuma questão pôde ser selecionada. Tente novamente.", 8000);
         return;
    }
    // --- Fim da Preparação ---


    // Mostra a interface principal do quiz
    showQuizInterface(elements);

    // Reseta estado do jogo
    currentQuestionIndex = 0;
    score = 0;
    isAnswered = false;
    selectedOptionElement = null;
    if(elements.messageArea) clearMessage(elements.messageArea); // Limpa mensagens do quiz anterior
    else { console.warn("Elemento messageArea do quiz não encontrado para limpar.");}

    // Configura título e UI inicial do quiz (com verificações)
    if(elements.quizTitleElement) elements.quizTitleElement.textContent = quizConfig.theme || "Quiz";
    else { console.warn("quizTitleElement não encontrado."); }

    if(elements.resultContainer) elements.resultContainer.classList.add('hide');
    else { console.warn("resultContainer não encontrado."); }

    if(elements.scoreContainer) elements.scoreContainer.classList.add('hide'); // Esconde pontuação inicial
    else { console.warn("scoreContainer não encontrado."); }

    if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    else { console.warn("nextBtn não encontrado."); }

    if(elements.finishBtn) elements.finishBtn.classList.add('hide');
    else { console.warn("finishBtn não encontrado."); }

    if(elements.confirmBtn) {
        elements.confirmBtn.classList.remove('hide');
        elements.confirmBtn.disabled = true; // Desabilitado até selecionar
    } else { console.error("confirmBtn não encontrado!"); }

    // Mostra a primeira questão (agora que quizData está pronto)
    showQuestion(quizData[currentQuestionIndex], elements);
}


// *** FIM: SEÇÃO DE SELEÇÃO DE QUANTIDADE (REVISADA) ***

// Atualiza a barra de progresso (REVISADA)
function updateProgressBar(elements) {
    // Verifica se temos dados e elementos necessários
    if (!quizData || !Array.isArray(quizData) || !elements.progressBarIndicator || !elements.progressTextElement) {
         // Não faz nada se não houver dados ou elementos, evita erro
         // console.warn("updateProgressBar: Dados ou elementos ausentes.");
         return;
    }

    const totalQuestions = quizData.length; // Usa a quantidade da rodada atual
    const currentQuestionNumber = currentQuestionIndex + 1; // Número da questão atual (1 a N)

    if (totalQuestions === 0) { // Evita divisão por zero se quizData estiver vazio por algum motivo
        elements.progressBarIndicator.style.width = '0%';
        elements.progressTextElement.textContent = 'Questão 0 de 0';
        return;
    }

    // Calcula progresso (0 a 100). Progresso aumenta *após* confirmar.
    // A barra deve mostrar o progresso até a questão *anterior*.
    // const progressPercentage = Math.min(((currentQuestionIndex) / totalQuestions) * 100, 100); // Atualizado
    // Ou, se preferir mostrar o progresso incluindo a atual (ex: 1/N -> X%):
     const progressPercentage = Math.min(((currentQuestionNumber) / totalQuestions) * 100, 100);


    elements.progressBarIndicator.style.width = `${progressPercentage}%`;
    elements.progressTextElement.textContent = `Questão ${currentQuestionNumber} de ${totalQuestions}`;
}


// Mostra a questão atual (REVISADA)
function showQuestion(questionData, elements) {
    console.log(`showQuestion: Index ${currentQuestionIndex}`);
    isAnswered = false;
    selectedOptionElement = null; // Reseta seleção

    // Limpa destaque de seleção da questão anterior
    if(elements.answerOptionsElement){
         const frames = elements.answerOptionsElement.querySelectorAll('.option-frame');
         frames.forEach(f => f.style.outline = 'none');
    }

    // Verifica dados da questão
    if(!questionData || typeof questionData.question !== 'string') {
         console.error("showQuestion: Dados da questão inválidos ou ausentes no índice:", currentQuestionIndex, questionData);
         if(elements.messageArea) showMessage(elements.messageArea, "Erro fatal ao carregar a próxima questão.", 5000);
         showResults(elements); // Tenta mostrar resultados se não puder carregar questão
         return;
    }

    // Atualiza texto da questão
    if(elements.questionTextElement) elements.questionTextElement.innerText = questionData.question;
    else { console.error("questionTextElement não encontrado!"); }

    // Limpa opções e mensagens anteriores
    if(elements.answerOptionsElement) elements.answerOptionsElement.innerHTML = '';
    else { console.error("answerOptionsElement não encontrado!"); return; } // Crítico
    if(elements.messageArea) clearMessage(elements.messageArea);

    // Verifica opções
    if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length === 0) {
        console.error("showQuestion: Opções inválidas ou ausentes para a questão:", questionData);
        if(elements.messageArea) showMessage(elements.messageArea, "Erro: Opções de resposta não encontradas para esta questão.", 5000);
        nextQuestion(elements); // Pula para próxima
        return;
    }

    // Embaralha as opções da questão atual (OPCIONAL)
    let shuffledOptions = [...questionData.options];
    shuffleArray(shuffledOptions);

    // Cria e adiciona os elementos das opções
    shuffledOptions.forEach((option) => {
         if (!option || typeof option.text !== 'string') {
             console.warn("Opção inválida encontrada:", option);
             return; // Pula opção inválida
         }
         const optionFrame = document.createElement('div');
         optionFrame.classList.add('option-frame');
         // Guarda o texto original da opção para identificar qual foi clicada depois
         optionFrame.dataset.optionText = option.text;

         const frontFace = document.createElement('div'); frontFace.className = 'front-face'; frontFace.textContent = option.text;
         const backFace = document.createElement('div'); backFace.className = 'back-face';
         const explanationSpan = document.createElement('span'); explanationSpan.className = 'explanation';
         explanationSpan.textContent = option.explanation || 'Sem explicação disponível.'; // Mensagem padrão
         backFace.appendChild(explanationSpan);

         optionFrame.appendChild(frontFace); optionFrame.appendChild(backFace);
         optionFrame.addEventListener('click', (event) => selectAnswer(event, elements));
         if(elements.answerOptionsElement) elements.answerOptionsElement.appendChild(optionFrame);
    });

    // Configura botões de controle
    if(elements.confirmBtn) {
        elements.confirmBtn.classList.remove('hide');
        elements.confirmBtn.disabled = true; // Desabilitado até selecionar
    } else { console.error("confirmBtn não encontrado!"); }

    if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    else { console.warn("nextBtn não encontrado."); }

    if(elements.finishBtn) elements.finishBtn.classList.add('hide');
    else { console.warn("finishBtn não encontrado."); }

    // Mostra container da questão
    if(elements.questionContainer) elements.questionContainer.classList.remove('hide');
    else { console.error("questionContainer não encontrado!"); }

    // Atualiza barra de progresso APÓS mostrar a questão
    updateProgressBar(elements);
}


// Seleciona uma resposta (REVISADA para toggle)
function selectAnswer(event, elements) {
    if (isAnswered) return; // Não permite selecionar após confirmar
    if(elements.messageArea) clearMessage(elements.messageArea); // Limpa mensagens

    const clickedFrame = event.currentTarget;
    if (!clickedFrame) return;

    // Verifica se o item clicado já está selecionado
    const isAlreadySelected = clickedFrame.classList.contains('selected');

    // Remove 'selected' de todos os outros frames
    if (elements.answerOptionsElement) {
        const allFrames = elements.answerOptionsElement.querySelectorAll('.option-frame');
        allFrames.forEach(frame => {
            if (frame !== clickedFrame) { // Não mexe no frame clicado ainda
                frame.classList.remove('selected');
            }
        });
    }

    // Alterna (toggle) a classe 'selected' no frame clicado
    clickedFrame.classList.toggle('selected');

    // Atualiza a referência global e habilita/desabilita botão confirmar
    if (clickedFrame.classList.contains('selected')) {
        selectedOptionElement = clickedFrame; // Guarda referência
        if(elements.confirmBtn) elements.confirmBtn.disabled = false;
        console.log('Opção selecionada. Botão Confirmar HABILITADO.');
    } else {
        selectedOptionElement = null; // Remove referência
        if(elements.confirmBtn) elements.confirmBtn.disabled = true;
        console.log('Opção desmarcada. Botão Confirmar DESABILITADO.');
    }
}


// Confirma a resposta selecionada (REVISADA)
function confirmAnswer(elements) {
    console.log('confirmAnswer: Iniciando...');
    if (!selectedOptionElement) {
        console.warn('confirmAnswer: Nenhuma opção selecionada.');
        if(elements.messageArea) showMessage(elements.messageArea,"Por favor, selecione uma opção antes de confirmar.", 3000);
        return;
    }
    if (isAnswered) {
        console.warn('confirmAnswer: Resposta já foi confirmada para esta questão.');
        return; // Não faz nada se já respondeu
    }

    isAnswered = true; // Marca que a resposta foi dada para esta questão
    if(elements.confirmBtn) {
        elements.confirmBtn.classList.add('hide'); // Esconde confirmar
        elements.confirmBtn.disabled = true; // Garante desabilitado
    }
    if(elements.messageArea) clearMessage(elements.messageArea); // Limpa mensagens

    try {
        // Pega o texto da opção que o usuário selecionou na interface
        const selectedOptionText = selectedOptionElement.dataset.optionText;
        if (typeof selectedOptionText === 'undefined') {
             throw new Error("Não foi possível obter o texto da opção selecionada (dataset.optionText ausente).");
        }

        // Busca os dados originais da questão atual
        if (!quizData || !quizData[currentQuestionIndex] || !quizData[currentQuestionIndex].options) {
            throw new Error(`Dados originais da questão ${currentQuestionIndex} não encontrados.`);
        }
        const currentOriginalOptions = quizData[currentQuestionIndex].options;

        // Encontra a opção correta nos dados ORIGINAIS
        const correctOptionData = currentOriginalOptions.find(opt => opt && opt.isCorrect === true);
        if (!correctOptionData || typeof correctOptionData.text !== 'string') {
             throw new Error(`Opção correta não definida corretamente nos dados da questão ${currentQuestionIndex}.`);
        }
        const correctOptionText = correctOptionData.text;

        // Compara o texto selecionado com o texto da opção correta
        const isCorrect = (selectedOptionText === correctOptionText);
        if (isCorrect) {
            score++;
            console.log("Resposta CORRETA! Pontuação atual:", score);
        } else {
            console.log("Resposta INCORRETA.");
        }

        // Aplica feedback visual a TODAS as opções na interface
        const allOptionFrames = elements.answerOptionsElement ? elements.answerOptionsElement.querySelectorAll('.option-frame') : [];
        allOptionFrames.forEach(frame => {
            if (!(frame instanceof HTMLElement)) return;

            // Pega o texto deste frame para encontrar seus dados originais
            const frameOptionText = frame.dataset.optionText;
            if (typeof frameOptionText === 'undefined') {
                 console.warn("Frame sem data-option-text encontrado:", frame);
                 return; // Pula este frame se não tiver texto
            }

            // Encontra os dados originais desta opção pelo texto
            const optionData = currentOriginalOptions.find(opt => opt && opt.text === frameOptionText);

            // Aplica classes de revelação e desabilita interação
            frame.classList.add('reveal', 'disabled');

            if (optionData) {
                 // Aplica classe 'correct' ou 'incorrect' baseado nos dados originais
                 if(optionData.isCorrect === true) {
                     frame.classList.add('correct');
                     frame.classList.remove('incorrect');
                 } else {
                     frame.classList.add('incorrect');
                     frame.classList.remove('correct');
                 }
            } else {
                 console.warn(`Dados não encontrados para a opção com texto: '${frameOptionText}'`);
                 frame.classList.add('incorrect'); // Marca como incorreto por segurança se dados sumiram
            }

            // Adiciona destaque extra à opção que foi SELECIONADA pelo usuário
            if (frame === selectedOptionElement) {
                 frame.style.outline = '3px solid #333'; // Destaque (preto)
                 frame.style.outlineOffset = '2px';
            } else {
                 frame.style.outline = 'none'; // Garante que outros não tenham outline
            }
        });

        // Atualiza e mostra a pontuação
        updateScoreDisplay(elements);
        if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide');

        // Decide qual botão mostrar (Próxima ou Finalizar)
        const isLastQuestion = currentQuestionIndex >= quizData.length - 1;
        // Pequeno delay para animação do flip
        setTimeout(() => {
            if (isLastQuestion) {
                if(elements.finishBtn) elements.finishBtn.classList.remove('hide');
                if(elements.nextBtn) elements.nextBtn.classList.add('hide');
            } else {
                if(elements.nextBtn) elements.nextBtn.classList.remove('hide');
                if(elements.finishBtn) elements.finishBtn.classList.add('hide');
            }
        }, 800); // 800ms (duração da animação .reveal)

    } catch (error) {
        console.error("ERRO GRAVE dentro de confirmAnswer:", error);
        if(elements.messageArea) showMessage(elements.messageArea, `Erro ao processar resposta: ${error.message}. Tente recarregar.`, 6000);
        // Esconde botões de navegação em caso de erro grave para evitar mais problemas
        if(elements.finishBtn) elements.finishBtn.classList.add('hide');
        if(elements.nextBtn) elements.nextBtn.classList.add('hide');
    }
}


// Vai para a próxima questão (REVISADA)
function nextQuestion(elements) {
    console.log("nextQuestion: Avançando do índice", currentQuestionIndex);

    // Limpa o destaque da opção selecionada na questão anterior
    if(selectedOptionElement && selectedOptionElement.style) {
         selectedOptionElement.style.outline = 'none';
    }

    currentQuestionIndex++; // Avança índice

    if (currentQuestionIndex < quizData.length) {
        // Ainda há questões
        console.log("Carregando próxima questão:", currentQuestionIndex);
        showQuestion(quizData[currentQuestionIndex], elements);
    } else {
        // Fim do quiz
        console.log("Fim do quiz. Mostrando resultados.");
        showResults(elements);
    }
}


// Mostra a tela de resultados finais (REVISADA)
function showResults(elements) {
    console.log("showResults: Exibindo tela final.");
    // Esconde todas as outras seções principais
    showOnly(elements.quizContainer, elements.selectionArea, elements.quizContainer, elements.questionCountSelectionContainer);

    // Garante que partes específicas do quiz estejam escondidas
    if(elements.questionContainer) elements.questionContainer.classList.add('hide');
    else { console.warn("questionContainer não encontrado para esconder em showResults."); }
    if(elements.progressContainer) elements.progressContainer.classList.add('hide');
    else { console.warn("progressContainer não encontrado para esconder em showResults."); }
    if(elements.controlsContainer) elements.controlsContainer.classList.add('hide');
    else { console.warn("controlsContainer não encontrado para esconder em showResults."); }
    if(elements.messageArea) clearMessage(elements.messageArea); // Limpa mensagens do quiz

    // Verifica se o container de resultados existe
    if (!elements.resultContainer) {
         console.error("CRITICAL: Elemento #result-container não encontrado! Não é possível mostrar resultados.");
         // Tenta mostrar a pontuação mesmo sem o container de resultados
         if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide');
         updateScoreDisplay(elements);
         return;
    }

    // Mostra o container de resultados e a pontuação final
    elements.resultContainer.classList.remove('hide');
    if(elements.scoreContainer) elements.scoreContainer.classList.remove('hide');

    // Calcula a string final da pontuação
    const finalScoreDisplay = calculateFinalScoreString();
    const totalQuestions = quizData.length; // Total de questões nesta rodada

    // Monta o HTML dos resultados
    elements.resultContainer.innerHTML = `
        <h2>Quiz '${quizConfig.theme || 'Quiz'}' Finalizado!</h2>
        <p>Você acertou <strong>${score}</strong> de <strong>${totalQuestions}</strong> perguntas.</p>
        <p>Sua pontuação final: <strong>${finalScoreDisplay}</strong></p>
        <button id="choose-another-theme-btn" class="control-btn back-btn" style="background-color: #007bff; color: white;">Jogar Novamente (Escolher Tema)</button>
    `;

    // Adiciona listener ao botão "Jogar Novamente"
    const chooseAnotherBtn = document.getElementById('choose-another-theme-btn');
    if(chooseAnotherBtn) {
        chooseAnotherBtn.addEventListener('click', () => {
             console.log("Botão 'Jogar Novamente' clicado.");
             if (elements.resultContainer) elements.resultContainer.classList.add('hide'); // Esconde resultados
             if (elements.scoreContainer) elements.scoreContainer.classList.add('hide'); // Esconde pontuação
             showThemeSelectionScreen(elements); // Volta para seleção de temas
        });
    } else {
         console.error("Botão #choose-another-theme-btn não encontrado após ser adicionado ao DOM.");
    }

    // Garante que a exibição da pontuação final (no #score-container) esteja correta
    updateScoreDisplay(elements);
}


// Atualiza a exibição da pontuação (REVISADA)
function updateScoreDisplay(elements) {
    console.log("updateScoreDisplay: Atualizando exibição da pontuação...");
    // Verifica elementos essenciais para a exibição
    if (!elements.scoreContainer || !elements.pointsDisplayContainer || !elements.percentageDisplayContainer || !elements.scoreValueElement || !elements.scorePercentageElement) {
        console.error("updateScoreDisplay: Elementos DOM necessários para a pontuação estão faltando. Abortando.");
        return;
    }
    // Verifica se a configuração do quiz está carregada
    if (!quizConfig || typeof quizConfig.scoring === 'undefined') {
        console.warn("updateScoreDisplay: Configuração do quiz (quizConfig.scoring) não definida. Não é possível determinar formato.");
        // Esconder ambos os displays se não souber o formato
        elements.pointsDisplayContainer.classList.add('hide');
        elements.percentageDisplayContainer.classList.add('hide');
         // Mas mostra o container principal
        elements.scoreContainer.classList.remove('hide');
        return;
    }

    const scoreString = calculateFinalScoreString(); // Pega a string formatada
    console.log(`updateScoreDisplay: String de pontuação calculada: '${scoreString}'`);

    // Se o cálculo falhou ou retornou N/A (ex: antes de iniciar)
    if (scoreString === "Erro" || scoreString === "N/A") {
         console.warn("updateScoreDisplay: Pontuação inválida ('Erro' ou 'N/A'). Exibindo '...'.");
         elements.scoreValueElement.textContent = "...";
         elements.scorePercentageElement.textContent = "...";
         // Esconder displays específicos se a pontuação não for válida
         elements.pointsDisplayContainer.classList.add('hide');
         elements.percentageDisplayContainer.classList.add('hide');
         // Mostra o container mesmo assim, para indicar que algo deveria estar ali
         elements.scoreContainer.classList.remove('hide');
         return;
    }

    const isPercentage = quizConfig.scoring === "percentage";
    console.log(`updateScoreDisplay: Modo scoring=${quizConfig.scoring}. É percentual? ${isPercentage}`);

    // Atualiza o display correto baseado no modo de pontuação
    if (isPercentage) {
        elements.scorePercentageElement.textContent = scoreString.replace('%', ''); // Remove o '%' para o span
        elements.percentageDisplayContainer.classList.remove('hide'); // Mostra %
        elements.pointsDisplayContainer.classList.add('hide'); // Esconde pontos
    } else { // Modo Pontos (default)
        const scoreValueOnly = scoreString.split(' ')[0]; // Pega só o número (ex: "80" de "80 / 100 pontos")
        elements.scoreValueElement.textContent = scoreValueOnly;
        elements.pointsDisplayContainer.classList.remove('hide'); // Mostra pontos
        elements.percentageDisplayContainer.classList.add('hide'); // Esconde %
    }

    // Garante que o container principal da pontuação esteja visível
    elements.scoreContainer.classList.remove('hide');
    console.log("updateScoreDisplay: Exibição da pontuação atualizada.");
}


// Calcula a string formatada da pontuação atual/final (REVISADA)
function calculateFinalScoreString() {
    console.log("calculateFinalScoreString: Calculando...");

    // Precisa de quizData e config para calcular
    if (!quizConfig || typeof quizConfig.scoring === 'undefined' || !quizData || !Array.isArray(quizData)) {
        console.warn("calculateFinalScoreString: Dados insuficientes (quizData ou config inválidos/ausentes). Retornando 'N/A'.");
        return "N/A";
    }

    const numQuestionsInRound = quizData.length; // Número de questões nesta rodada específica

    // Se a rodada não tem questões (não deveria acontecer após startGame, mas checa)
    if (numQuestionsInRound === 0) {
        console.warn("calculateFinalScoreString: Tentando calcular pontuação com 0 questões na rodada.");
        return "0"; // Ou "N/A"
    }

    // Verifica se 'score' é um número válido
    if (typeof score !== 'number' || isNaN(score)) {
         console.error("calculateFinalScoreString: Variável 'score' inválida:", score);
         return "Erro";
    }


    console.log(`calculateFinalScoreString: score=${score}, numQuestionsInRound=${numQuestionsInRound}, scoring=${quizConfig.scoring}, totalPointsConfig=${quizConfig.totalPoints}, fullQuizData.length=${fullQuizData ? fullQuizData.length : 'N/A'}`);
    let scoreDisplayString = "Erro"; // Default

    try {
        if (quizConfig.scoring === "percentage") {
            console.log("Calculando percentual...");
            const percentage = Math.round((score / numQuestionsInRound) * 100);
            scoreDisplayString = `${percentage}%`;
        } else { // Modo Pontos (default)
            console.log("Calculando pontos...");
            const totalPointsConfig = quizConfig.totalPoints; // Total definido no JSON
            const totalOriginalQuestions = fullQuizData.length; // Total original do arquivo
            let currentScoreValue;
            let totalString = '';

            // Verifica se o total de pontos foi configurado e se temos o total original de questões
            if (totalPointsConfig && typeof totalPointsConfig === 'number' && totalPointsConfig > 0 && totalOriginalQuestions > 0) {
                 // Calcula pontos proporcionais ao total original configurado
                 const pointsPerOriginalQuestion = totalPointsConfig / totalOriginalQuestions;
                 currentScoreValue = Math.round(score * pointsPerOriginalQuestion);
                 totalString = ` / ${totalPointsConfig}`; // Mostra o total original como referência
                 console.log(`Modo pontos proporcional (original: ${totalPointsConfig} pts / ${totalOriginalQuestions} qsts = ${pointsPerOriginalQuestion.toFixed(2)} pts/qst)`);
            } else {
                 // Modo simples: 1 ponto por acerto, total é o número de questões da rodada
                 currentScoreValue = score;
                 totalString = ` / ${numQuestionsInRound}`; // Mostra o total da rodada
                  console.log(`Modo pontos simples (1 por acerto).`);
            }

            const unitString = " ponto" + (currentScoreValue !== 1 ? "s" : ""); // Plural
            scoreDisplayString = `${currentScoreValue}${totalString}${unitString}`;
        }
    } catch (error) {
        console.error("Erro dentro de calculateFinalScoreString durante cálculo:", error);
        scoreDisplayString = "Erro";
    }

    console.log(`calculateFinalScoreString: Resultado: '${scoreDisplayString}'`);
    return scoreDisplayString;
}


// Mostra uma mensagem temporária (erro ou sucesso) (REVISADA)
// Adicionado parâmetro opcional useSpecificTimeout para diferenciar timeouts
function showMessage(messageAreaElement, message, duration = 3000, isError = true, useSpecificTimeout = false) {
    if (!messageAreaElement || !(messageAreaElement instanceof Element)) {
        console.warn("showMessage: Elemento da área de mensagem inválido ou não fornecido.", messageAreaElement);
        // Tenta mostrar no body como fallback extremo
        // alert(`${isError ? 'Erro' : 'Info'}: ${message}`);
        return;
    }

    // Escolhe qual variável de timeout usar
    let timeoutVar = useSpecificTimeout ? countMessageTimeout : messageTimeout;
    const timeoutSetter = (newTimeout) => {
        if (useSpecificTimeout) { countMessageTimeout = newTimeout; }
        else { messageTimeout = newTimeout; }
    };

    // Limpa timeout anterior para esta área, se houver
    if (timeoutVar) {
        clearTimeout(timeoutVar);
        timeoutSetter(null);
    }

    // Define texto e classes
    messageAreaElement.textContent = message;
    messageAreaElement.className = 'message-area'; // Reseta classes base
    messageAreaElement.classList.add(isError ? 'error' : 'success'); // Adiciona classe de estado (precisa definir no CSS)
    messageAreaElement.classList.remove('hide'); // Torna visível

    // Define novo timeout para esconder
    const newTimeoutId = setTimeout(() => {
         messageAreaElement.classList.add('hide');
         messageAreaElement.textContent = ''; // Limpa texto ao esconder
         messageAreaElement.classList.remove('error', 'success'); // Limpa classes de estado
         timeoutSetter(null); // Limpa variável de timeout
         }, duration);
    timeoutSetter(newTimeoutId); // Guarda ID do novo timeout
}

// Limpa a mensagem imediatamente (REVISADA)
function clearMessage(messageAreaElement, useSpecificTimeout = false) {
    if (!messageAreaElement || !(messageAreaElement instanceof Element)) return;

    let timeoutVar = useSpecificTimeout ? countMessageTimeout : messageTimeout;
    const timeoutSetter = (newTimeout) => {
        if (useSpecificTimeout) { countMessageTimeout = newTimeout; }
        else { messageTimeout = newTimeout; }
    };

    // Limpa timeout pendente, se houver
     if (timeoutVar) {
         clearTimeout(timeoutVar);
         timeoutSetter(null);
     }

    // Esconde e limpa
    messageAreaElement.classList.add('hide');
    messageAreaElement.textContent = '';
    messageAreaElement.classList.remove('error', 'success');
}

// --- Inicialização DOMContentLoaded (REVISADA COM LIMPEZA INICIAL) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Evento disparado. Configurando interface...");

    // Mapeamento dos elementos do DOM para o objeto 'elements'
    const elements = {
        mainContainer: document.querySelector('.main-container'),
        // Seleção Tema/Subtema
        selectionArea: document.getElementById('selection-area'),
        themeSelectionContainer: document.getElementById('theme-selection-container'),
        themeButtonsContainer: document.getElementById('theme-buttons'),
        subthemeSelectionContainer: document.getElementById('subtheme-selection-container'),
        subthemeTitleElement: document.getElementById('subtheme-title'),
        subthemeButtonsContainer: document.getElementById('subtheme-buttons'),
        backToThemesBtn: document.getElementById('back-to-themes-btn'), // Botão voltar de Subtema->Tema

        // Seleção de Quantidade
        questionCountSelectionContainer: document.getElementById('question-count-selection'),
        questionCountTitleElement: document.getElementById('question-count-title'),
        maxQuestionsInfoElement: document.getElementById('max-questions-info'),
        maxQuestionsLabelElement: document.getElementById('max-questions-label'),
        questionCountInputElement: document.getElementById('question-count-input'),
        startQuizWithCountBtn: document.getElementById('start-quiz-with-count-btn'), // Listener adicionado/removido dinamicamente
        backToSelectionFromCountBtn: document.getElementById('back-to-selection-from-count-btn'), // Listener adicionado/removido dinamicamente
        questionCountMessageArea: document.getElementById('question-count-message'), // Mensagem nesta seção

        // Quiz Principal
        quizContainer: document.getElementById('quiz-container'),
        quizTitleElement: document.getElementById('quiz-title'),
        progressContainer: document.getElementById('progress-container'),
        progressBarIndicator: document.getElementById('progress-bar-indicator'),
        progressTextElement: document.getElementById('progress-text'),
        questionContainer: document.getElementById('question-container'),
        questionTextElement: document.getElementById('question-text'),
        answerOptionsElement: document.getElementById('answer-options'), // Container das opções (options-grid)
        messageArea: document.getElementById('message-area'), // Mensagem de erro DENTRO do quiz
        controlsContainer: document.querySelector('.controls'), // Container dos botões Confirm/Next/Finish
        confirmBtn: document.getElementById('confirm-btn'),
        nextBtn: document.getElementById('next-btn'),
        finishBtn: document.getElementById('finish-btn'),

        // Pontuação e Resultados
        scoreContainer: document.getElementById('score-container'),
        scoreValueElement: document.getElementById('score-value'),
        scorePercentageElement: document.getElementById('score-percentage'),
        pointsDisplayContainer: document.getElementById('points-score-display'),
        percentageDisplayContainer: document.getElementById('percentage-score-display'),
        resultContainer: document.getElementById('result-container')
    };

    // Verificação de elementos essenciais pós-mapeamento
    let missingElementCritical = false;
    for (const key in elements) {
        // Verifica se a propriedade existe no objeto E se o valor é null (indicando que getElementById falhou)
        // Permite nulls se não for um elemento crítico (ex: selectedOptionElement não está aqui)
        if (elements.hasOwnProperty(key) && elements[key] === null) {
            // Constrói um ID provável a partir da chave para a mensagem de erro
             let probableId = key.replace('Element', '').replace(/([A-Z])/g, '-$1').toLowerCase();
             // Casos especiais
             if (key === 'answerOptionsElement') probableId = 'answer-options';
             if (key === 'controlsContainer') probableId = '.controls (classe)';

            console.warn(`Elemento mapeado como 'elements.${key}' (provável ID/seletor: #${probableId}) não foi encontrado no DOM.`);
             // Definir quais são críticos
             const criticalKeys = ['selectionArea', 'quizContainer', 'questionCountSelectionContainer', 'mainContainer', 'confirmBtn', 'answerOptionsElement'];
             if (criticalKeys.includes(key)) {
                 console.error(`ERRO CRÍTICO: Elemento essencial '${key}' não encontrado!`);
                 missingElementCritical = true;
             }
        }
    }


    if (missingElementCritical) {
        document.body.innerHTML = '<p style="color: red; text-align: center; font-size: 1.2em; padding: 30px;">Erro crítico: Elementos HTML essenciais da página não foram encontrados. O aplicativo não pode iniciar. Verifique o HTML e os IDs.</p>';
        return; // Interrompe a execução
    } else {
         console.log("Verificação inicial de elementos concluída com sucesso.");
    }

    // *** INÍCIO DA CORREÇÃO ADICIONAL: Esconder tudo explicitamente no início ***
    console.log("Aplicando estado inicial de visibilidade (escondendo containers)...");
    // Esconde containers principais que não devem aparecer no início
    if(elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
    if(elements.questionCountSelectionContainer) elements.questionCountSelectionContainer.classList.add('hide');
    if(elements.quizContainer) elements.quizContainer.classList.add('hide');
    // Garante que a área de seleção principal NÃO esteja escondida (ela contém os temas)
    if(elements.selectionArea) elements.selectionArea.classList.remove('hide');
    // E dentro da área de seleção, garante que só a seleção de temas esteja visível
    if(elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');

    // *** FIM DA CORREÇÃO ADICIONAL ***

    // --- Configuração dos Listeners de Eventos Estáticos ---
    // Só adiciona listeners se os botões foram encontrados

    // Botão Voltar (Subtema -> Tema)
    if (elements.backToThemesBtn) {
        elements.backToThemesBtn.addEventListener('click', () => {
            console.log("Botão 'Voltar aos Temas' (de subtema) clicado.");
            if(elements.subthemeSelectionContainer) elements.subthemeSelectionContainer.classList.add('hide');
            // Mostra a seleção de temas principal
            if(elements.themeSelectionContainer) elements.themeSelectionContainer.classList.remove('hide');
             currentSelectedTheme = null; // Limpa tema pai ao voltar
        });
    } else { console.warn("Botão #back-to-themes-btn não encontrado."); }

    // Botão Confirmar Resposta
    if (elements.confirmBtn) {
        elements.confirmBtn.addEventListener('click', () => {
            console.log('EVENTO: Click em Confirmar Resposta');
            confirmAnswer(elements);
        });
    } else { console.error("Botão #confirm-btn não encontrado!"); }

    // Botão Próxima Questão
    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', () => {
             console.log('EVENTO: Click em Próxima');
             nextQuestion(elements);
        });
    } else { console.warn("Botão #next-btn não encontrado."); }

    // Botão Finalizar Quiz
    if (elements.finishBtn) {
        elements.finishBtn.addEventListener('click', () => {
             console.log('EVENTO: Click em Finalizar Quiz');
             showResults(elements);
        });
    } else { console.warn("Botão #finish-btn não encontrado."); }

    // NOTA: Os listeners para os botões dentro de #question-count-selection
    // são adicionados/removidos dinamicamente na função showQuestionCountSelection.

    // --- Inicia a aplicação ---
    // A chamada agora deve APENAS carregar os temas,
    // pois o estado inicial de visibilidade já foi forçado acima.
    console.log("Carregando temas iniciais...");
    loadThemes(elements); // Apenas carrega os temas. showThemeSelectionScreen NÃO é mais chamada aqui.


    // --- Log de inicialização ---
    const now = new Date();
    let options = { hour12: false, timeZone: 'America/Sao_Paulo' }; // Define um timezone padrão
    try { options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { console.warn("Não foi possível detectar timezone local, usando America/Sao_Paulo."); }
    console.log(`Interface JavaScript pronta e configurada: ${now.toLocaleString('pt-BR', options)} (${options.timeZone})`);
});