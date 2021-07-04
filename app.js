var app = require('./sys/config/express')();
var uglify = require("uglify-js");
var fs = require('fs');
var request = require('request');
const axios = require('axios')
var serverOn = false;
const cheerio = require('cheerio');
const colors = require('colors');
const livereload = require("livereload"), liveReloadServer = livereload.createServer();

console.log(" ");

liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 10);
});

var pageURL = "";
var result;
var objJ;
var etapaAtual = "";
var protocolo = "https://";

var LayInt;
var objSysConfig = JSON.parse(fs.readFileSync('./sys/config/system_access.json').toString());
var objConfig = JSON.parse(fs.readFileSync('./sys/config/config.json').toString());
var configJs = JSON.parse(fs.readFileSync('./layout/config/config.json'));


var LOJA = objConfig.token;
var PAGE = objConfig.editar_pagina;


var head = "";//fs.readFileSync('./public/head.html').toString();
var bottom = "";//fs.readFileSync('./public/bottom.html').toString();
var logo = "";//fs.readFileSync('./public/logo.html').toString();
var includes = fs.readFileSync('./public/includes.html').toString();


var index = htmlModulosTagsHtml(fs.readFileSync('./layout/estrutura_index.html').toString());
var listagem = htmlModulosTagsHtml(fs.readFileSync('./layout/estrutura_listagem.html').toString());
var sem_direita = htmlModulosTagsHtml(fs.readFileSync('./layout/estrutura_outras_paginas.html').toString());
var produto_detalhes = htmlModulosTagsHtml(fs.readFileSync('./layout/estrutura_pagina_produto.html').toString());


var topo = htmlModulosTagsHtml(fs.readFileSync('./layout/include/topo.html').toString());
var barra = htmlModulosTagsHtml(fs.readFileSync('./layout/include/barra.html').toString());
var esquerda = htmlModulosTagsHtml(fs.readFileSync('./layout/include/esquerda.html').toString());
var direita = htmlModulosTagsHtml(fs.readFileSync('./layout/include/direita.html').toString());
var rodape = htmlModulosTagsHtml(fs.readFileSync('./layout/include/rodape.html').toString());
var complemento = htmlModulosTagsHtml(fs.readFileSync('./layout/include/complemento.html').toString());


var QueryLayout = "";
if (objConfig.temaBase) { QueryLayout = "&layout=" + objConfig.temaBase; }


request.get(objSysConfig.endpoint + '/lojas/dados/dadosloja/?LV_ID=' + LOJA + QueryLayout, function (error, response, body) {

    if (!error && response.statusCode == 200) {

        try {

            objJ = JSON.parse(body);
            showPage();

        } catch (e) {

            console.log("")
            console.log("Nao foi possivel iniciar o processo".red.bold);
            console.log("verifique se o token informado e valido.");
            console.log("")

        }

    } else {
        console.log("Falha ao iniciar projeto:".red + response.statusCode);
    }
});

app.get('*', (req, res, next) => {

    if (req.url.indexOf(".ico") >= 0
        || req.url.indexOf('/CheckoutSmart/') >= 0
        || req.url.indexOf('.jpg') >= 0
        || req.url.indexOf('.gif') >= 0
        || req.url.indexOf('.png') >= 0
        || req.url.indexOf('.css') >= 0
        || req.url.indexOf('.js') >= 0
    ) {
        return next();
    }

    res.sendFile(__dirname + '/public/index.html');

});

function showPage() {

    try {

        LOJA = objJ.loja;

        pageURL = PAGE;
        if (pageURL == "") { pageURL = "/"; }

        console.log("Codigo da loja:".bold + LOJA);
        console.log("Editando a pagina:".bold + pageURL);

        var urlComplete = "";
        if (pageURL != "/") {
            urlComplete = pageURL.replace("/" + objJ.loja_nome, "");
        }

        if (urlComplete != "" || 1==1) {
            
            if (objJ.dominio.indexOf("lojas.webstore") >= 0 || objJ.dominio.indexOf("lojamodelolocal") >= 0) { protocolo = "http://"; }

            axios
                .post(protocolo + objJ.dominio + urlComplete + "?edicao_remota=true&token=" + LOJA, {
                    Html_index: index,
                    Html_listagem: listagem,
                    Html_sem_direita: sem_direita,
                    Html_produto_detalhes: produto_detalhes,
                    Html_topo: topo,
                    Html_barra: barra,
                    Html_esquerda: esquerda,
                    Html_direita: direita,
                    Html_rodape: rodape,
                    Html_complemento: complemento
                })
                .then(res => {
                    showPage_step2(res.data);
                })
                .catch(error => {
                    console.error(error);
                });

        } else {

            showPage_step2("");

        }

    } catch (e) {
        console.log(e.message);
    }

}

function showPage_step2(bodyPage) {

    try {

        const $ = cheerio.load(bodyPage);
        etapaAtual = $('#HdEtapaLoja').val();

        LOJA = objJ.loja;

        logo = logo.replace("##CAMINHOLOGO##", "http://images.webstore.net.br/files/" + LOJA + "/" + objJ.logotipo);

        LayInt = Number(objJ.layout);
        try {
            if (objConfig.temaBase) {
                LayInt = Number(objConfig.temaBase);
                console.log("Usando layout (" + LayInt + ") como base");
            }
        } catch (e) { }

        console.log("Etapa:".bold + etapaAtual);
        console.log("Dominio:".bold + objJ.dominio);
        console.log("Nome da loja:".bold + objJ.loja_nome);


        var find = ["<!--##CLEAR_CSS##-->", "<!--##H1_DIV##-->", "<!--##LOGOTIPO##-->", "<!--##VALOR_PRODUTOS_CARRINHO##-->"];
        var replace = ["", "h1", logo, "00"];
        topo = replaceStr(topo, find, replace);


        rodape = replaceStr(rodape, find, replace);
        complemento = replaceStr(complemento, find, replace);

        var find2 = ["<!--###TOPO###-->", "<!--###BARRA###-->", "<!--###BARRA_ESQUERDA###-->", "<!--###RODAPE###-->", "<!--###COMPLEMENTO###-->"];
        var replace = [topo, barra, esquerda, rodape, complemento];
        index = replaceStr(index, find2, replace);

        result = head + index + bottom;

        find = ["<!--###IMAGENS_CLIENTE###-->"];
        replace = ["http://images.webstore.net.br/files/" + LOJA + "/" + LayInt + "/"];
        result = replaceStr(result, find, replace);

        result += "<input type='hidden' id='LOJA' value='" + LOJA + "'/>";
        result += "<input type='hidden' id='HdTokenLojaTemp' value='" + objSysConfig.tokenSys + "'/>";


        if (bodyPage != "") {
            result = bodyPage + includes;
        }

        htmlModulos();

        if (!serverOn) {
            app.listen(3000, function () {
                console.log(" ");
                console.log("Acesse " + "http://localhost:3000".green.bold +" em seu navegador para visualizar a loja.");
                console.log("__________________________________________________________________________________________");

                console.log(" ");
                serverOn = true;
            });
        }
                

    } catch (e) {
        console.log(e.message);
    }

}

function htmlModulos() {

    try {

        var css = "";
        var js = "";

        js += "var SetEndPointRestCalls = 'http://" + objJ.dominio + "';";

        result = ajustaUrlsAssets(result);

        if (configJs.modulos) {
            for (var i = 0; i < configJs.modulos.length; i++) {

                if (configJs.modulos[i].etapa.indexOf(etapaAtual) >= 0 || configJs.modulos[i].etapa == "*") {
                    var tag = createTag(configJs.modulos[i], "padrao");
                    var moduloHtml = getModuloHtml(configJs.modulos[i], "padrao");
                    result = result.replace(tag, moduloHtml);

                    var moduloCss = getModuloCss(configJs.modulos[i], "padrao");
                    css += moduloCss;

                    var moduloJs = getModuloJs(configJs.modulos[i], "padrao");
                    js += moduloJs + '\n';
                }

            }
        }

        if (configJs.modulos_loja) {
            for (var i = 0; i < configJs.modulos_loja.length; i++) {

                if (configJs.modulos_loja[i].etapa.indexOf(etapaAtual) >= 0 || configJs.modulos_loja[i].etapa == "*") {

                    var tag = createTag(configJs.modulos_loja[i]);
                    var moduloHtml = getModuloHtml(configJs.modulos_loja[i], "loja");
                    result = result.replace(tag, moduloHtml);

                    var moduloCss = getModuloCss(configJs.modulos_loja[i], "loja");
                    css += moduloCss;

                    var moduloJs = getModuloJs(configJs.modulos_loja[i], "loja");
                    js += moduloJs + '\n';

                }

            }
        }

        css += fs.readFileSync('./layout/assets/folha.css').toString();

        js += fs.readFileSync('./layout/assets/functions.js').toString();

        try {
            if (LayInt < 1000) {
                css = fs.readFileSync('./public/css/cssBase.css').toString() + css;
            }
        } catch (e) { }

        var find = [];
        var replace = [];
        for (var i = 1; i <= 50; i++) {
            var tag = 'PREF_' + i;
            var value = configJs[tag];

            find.push("<!--###" + tag + "###-->");
            replace.push("#" + value)
        }

        css = replaceStr(css, find, replace);

        find = ["<!--###IMAGENS_CLIENTE###-->"];
        replace = ["http://images.webstore.net.br/files/" + LOJA + "/" + LayInt + "/"];
        css = replaceStr(css, find, replace);

        result = ajustaUrlsAssets(result.replace("value='4924'", "value='" + LOJA + "'"));

        fs.writeFile('./public/index.html', result, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;
        });

        fs.writeFile('./public/css/css.css', css, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;
        });

        fs.writeFile('./public/js/script.js', js, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;
        });

    } catch (e) {
        console.log("Erro gerando modulos" + e.message);
    }

}

function htmlModulosTagsHtml(conteudo) {

    try {

        if (configJs.modulos) {
            for (var i = 0; i < configJs.modulos.length; i++) {
                var tag = createTag(configJs.modulos[i], "padrao");
                var moduloHtml = getModuloHtml(configJs.modulos[i], "padrao");
                conteudo = conteudo.replace(tag, moduloHtml);
            }
        }

        if (configJs.modulos_loja) {
            for (var i = 0; i < configJs.modulos_loja.length; i++) {
                var tag = createTag(configJs.modulos_loja[i]);
                var moduloHtml = getModuloHtml(configJs.modulos_loja[i], "loja");
                conteudo = conteudo.replace(tag, moduloHtml);
            }
        }


    } catch (e) {
        console.log("Erro gerando modulos " + e.message);
    }

    return conteudo;

}

function getModuloHtml(modulo, tipo) {
    
    var caminho = "";
    if (tipo == "padrao") {
        caminho = './sys/modulos_padroes/' + modulo.nome + '/' + modulo.versao + '/' + modulo.nome + '.html';
    } else {
        caminho = './layout/modulos_loja/' + modulo.nome + '/' + modulo.nome + '.html';
    }
	try{
		var retorno = fs.readFileSync(caminho).toString();
		return retorno
    } catch (e) {
        //console.log("Trying to get " + modulo.nome + " - " + tipo);
        //console.log(e.message);
		return ""
	}
}

function getModuloCss(modulo, tipo) {
    var caminho = "";
    if (tipo == "padrao") {
        caminho = './sys/modulos_padroes/' + modulo.nome + '/' + modulo.versao + '/' + modulo.nome + '.css';
    } else {
        caminho = './layout/modulos_loja/' + modulo.nome + '/' + modulo.nome + '.css';
    }

	try{
		var retorno = fs.readFileSync(caminho).toString();
		return retorno
	}catch(e){
		return ""
	}
}

function getModuloJs(modulo, tipo){
    var caminho = "";
    if (tipo == "padrao") {
        caminho = './sys/modulos_padroes/' + modulo.nome + '/' + modulo.versao + '/' + modulo.nome + '.js';
    } else {
        caminho = './layout/modulos_loja/' + modulo.nome + '/' + modulo.nome + '.js';
    }

	try{
		var retorno = fs.readFileSync(caminho).toString();
		return retorno
	}catch(e){
		return ""
	}
}

function createTag(modulo, tipo){
    nome = modulo.nome.toUpperCase();
    if (tipo == "padrao") {
        return "<!--##" + nome + modulo.versao + "##-->";
    } else {
        return "<!--##[LOJA]" + nome + "##-->";
    }
}

function replaceStr(str, find, replace) {
	for (var i = 0; i < find.length; i++) {
		str = str.replace(new RegExp(find[i], 'gi'), replace[i]);
	}
	return str;
}

function ajustaUrlsAssets(conteudo) {

    while (conteudo.indexOf("src=\"/lojas/") >= 0 || conteudo.indexOf("src='/lojas/") >= 0) {

        conteudo = conteudo.replace("src=\"/lojas/", "src=\""+ protocolo + objJ.dominio + "/lojas/");
        conteudo = conteudo.replace("src='/lojas/", "src='" + protocolo + objJ.dominio + "/lojas/");

    }

    while (conteudo.indexOf("src=\"/layouts") >= 0 || conteudo.indexOf("src='/layouts") >= 0) {

        conteudo = conteudo.replace("src=\"/layouts", "src=\"" + protocolo + objJ.dominio + "/layouts/");
        conteudo = conteudo.replace("src='/layouts", "src='" + protocolo + objJ.dominio + "/layouts/");

    }

    while (conteudo.indexOf("href=\"/lojas/") >= 0 || conteudo.indexOf("href='/lojas/") >= 0) {

        conteudo = conteudo.replace("href=\"/lojas/", "href=\"" + protocolo + objJ.dominio + "/lojas/");
        conteudo = conteudo.replace("href='/lojas/", "href='" + protocolo + objJ.dominio + "/lojas/");

    }

    return conteudo;

}