const debug = "https://paracefas-library-api.herokuapp.com";
const URL = debug + "/api/books/";
const LOGIN = debug + "/login";
const LEND = URL + "lend";
const GIVEBACK = URL + "giveback";

// Partial stolen from https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exhs) {
    const d = new Date();
    d.setTime(d.getTime() + (exhs*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// Stolen from https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

async function login_cookie() {
    const username = window.prompt("Ingrese usuario");
    const password = window.prompt("Ingrese constraseña");
    const r = await fetch(LOGIN,
                          {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({username:username, password:password})
                          });
    setCookie("connected-api", "true", 1 /*hs*/);
}

async function post() {
    if (getCookie("connected-api") == "")
        await login_cookie();
    const Author = document.getElementById("Author").value;
    const Name = document.getElementById("Name").value;
    const Year = document.getElementById("Year").value;
    const Publisher = document.getElementById("Publisher").value;
    const Where = document.getElementById("Where").value;
    const Code = document.getElementById("Code").value;

    const rawResponse = await fetch(URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        // Note to me in the future: I'm not stupid, I mean really I am, but I actually know that ECS6 allows to do { Author...} instead of { Author: Author... } but there's a pretty weird bug that if you do as first case redirect doesn't work (lel).
        body: JSON.stringify({ Author: Author, Name: Name, Year: Year, Publisher: Publisher, Where: Where, Code: Code })
    });
    window.location.reload();
}

async function copy_to_clipboard (html) {
    let container = document.createElement('div')
    container.innerHTML = html
    
    // Hide element
    container.style.position = 'fixed'
    container.style.pointerEvents = 'none'
    container.style.opacity = 0

    // Detect all style sheets of the page
    let activeSheets = Array.prototype.slice.call(document.styleSheets)
        .filter(function (sheet) {
            return !sheet.disabled
        })

    // Mount the iframe to the DOM to make `contentWindow` available
    document.body.appendChild(container)

    // Copy to clipboard
    window.getSelection().removeAllRanges()
    
    let range = document.createRange()
    range.selectNode(container)
    window.getSelection().addRange(range)

    document.execCommand('copy')
    for (let i = 0; i < activeSheets.length; i++) activeSheets[i].disabled = true
    document.execCommand('copy')
    for (let i = 0; i < activeSheets.length; i++) activeSheets[i].disabled = false
    
    // Remove the iframe
    document.body.removeChild(container)
}

async function open_dialog_lend (obj_hash, lended, cite) {
    // lended == true: To give back a [obj_hash] book.
    if (lended) { 
        if (window.confirm("¿Devolver?")) {
            if (getCookie("connected-api") == "")
                await login_cookie();

            await fetch (GIVEBACK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ BookHash: obj_hash })
            });
        }
    }
    // lended == false: To lend a [obj_hash] book.
    if (!lended) window.location.href = "#lend_data";
    document.getElementById("lend-btn").addEventListener("click", async () => {
        if (getCookie("connected-api") == "")
            await login_cookie();

        Date.prototype.addDays = function(days) {
            let date = new Date(this.valueOf());
            date.setDate(date.getDate() + days);
            return date;
        }
        const date_str = (today) => today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        
        const Body = {
            Hash: obj_hash,
            Name: document.getElementById("lend-name").value,
            Email: document.getElementById("lend-email").value,
            Mobile: document.getElementById("lend-mobile").value,
            Date: date_str(new Date)
        };
        
        const res = await fetch(LEND, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Body)
        });

        Email.send({
	        Host: "smtp.gmail.com",
	        Username : "biblioteca.san.ezequiel@gmail.com",
	        Password : "Hortensius",
	        To : Body.Email,
	        From : "biblioteca.san.ezequiel@gmail.com",
	        Subject : "Biblioteca San Ezequiel Moreno",
	        Body : Body.Name + " se te ha concedido en carácter de prestamo el Libro: " + cite +
                ".\nTe recordamos que debes regresarlo antes de 15 días (" + date_str(new Date().addDays(15)) + "), cuando lo hagas déjalo sobre una mesa (No guardar en los estantes). También recordá que debes destildar el libro en " + URL + "."
	    }).then(
		    message => console.log("Mail sent")
	    );
    });
}

async function src_by(by) {
    const to_src = document.getElementById("to_src").value;
    const rawResponse = await fetch(URL + by + to_src);
    const content = await rawResponse.json();
    document.getElementById("img").style.display = "none";
    document.getElementById("src_box").style.paddingTop = "10px";
    let table = "<table id='results'><tr><th>Autor</th><th>Libro</th><th>Año</th><th>Editorial</th><th>Ciudad de origen</th><th>Código biblioteca</th><th>Citado</th><th>Prestado</th></tr>";
    for (let obj of content) {
        const author = obj["Author"];
        const name = obj["Name"];
        const year = obj["Year"];
        const publisher = obj["Publisher"];
        const where = obj["Where"];
        const code = obj["Code"];
        const lended = obj["Lended"] == "true";
        const hash = obj["Hash"];
        const cite = `${author}, <i id="result-cite">${name}</i> (${where}: ${publisher}, ${year})`;
        const cln_cite = `${author}, <i>${name}</i> (${where}: ${publisher}, ${year})`;
        table += `<tr><td>${author}</td><td>${name}</td><td>${year}</td><td>${publisher}</td><td>${where}</td><td>${code}</td><td>${cite} <img src="./img/copy-to-cpliboard.png" height=12 width=12 onclick="copy_to_clipboard('${cln_cite}')"></img></td><td><input type="checkbox" onclick="open_dialog_lend('${hash}', ${lended}, '${cln_cite}')" ${lended ? "checked" : ""}></td></tr>`;
    }
    table += "</table>"
    document.getElementById("src-content").innerHTML = table;
}


