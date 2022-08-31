const cheerio = require("cheerio")

function getAuthor(c, el) {
    return c("td", el).eq(1).text()
}

function getTitle(c, el) {
    let a = c("td", el).eq(2).find("a")
    c("i", a).remove()
    
    return c("td", el).eq(2).find("a").text()
}

function getLink(c, el) {
    let a = c("td", el).eq(2).find("a").length

    return (a === 1) ? c("td", el).eq(2).find("a").attr("href").replace(/.+=/s, "http://library.lol/main/") : c("td", el).eq(2).find("a").eq(1).attr("href").replace(/.+=/s, "http://library.lol/main/")
}

function getExt(c, el) {
    return c("td", el).eq(8).text()  
}

function getLang(c, el) {
    return c("td", el).eq(6).text()
}

function getPages(c, el) {
    return c("td", el).eq(5).text()
}

function getSize(c, el) {
    return c("td", el).eq(7).text()
}

function getYear(c, el) {
    return c("td", el).eq(4).text()     
}

function getBooks(rawData) { 
    let $ = cheerio.load(rawData) 
    let books = []

    $("tr", "table.c tbody").slice(1).each((i, el) => {
        books.push({
            title: getTitle($, el),
            author: getAuthor($, el),
            link: getLink($, el),
            format: getExt($, el),
            lang: getLang($, el),
            page: getPages($, el),
            size: getSize($, el),
            year: getYear($, el)
        })
    })

    return books
}

function extract(books, i, bId) {
    let send = ""
    let keys
    i = i - 1

    if (books.length <= 5) {
        keys = [[
            {
                text: "Close",
                callback_data: `${bId}=close`
            }
        ]]
    } else if (Math.ceil((books.length / 5)) - 1 === i) {
        keys = [[
            {
                text: "Previous",
                callback_data: `${bId}=previous`
            }, {
                text: "Close",
                callback_data: `${bId}=close`
            }
        ]]
    } else if (i === 0) {
        keys = [[
            {
                text: "Next",
                callback_data: `${bId}=next`
            }, {
                text: "Close",
                callback_data: `${bId}=close`
            }
        ]]
    } else {
        keys = [[
            {
                text: "Previous",
                callback_data: `${bId}=previous`
            }, {
                text: "Next",
                callback_data: `${bId}=next`
            }, {
                text: "Close",
                callback_data: `${bId}=close`
            }
        ]]
    }

//where to start count on current page      checks if last page         count to last of book list    count to last of page
    for (let a = (5 * i); a <= ((Math.ceil((books.length / 5)) - 1 === i) ? (books.length - 1) : ((5 * (i + 1)) - 1)); a++) {
        send += `Title: ${books[a].title}\nAuthor: ${books[a].author}\nLink: ${books[a].link}\nFormat: ${books[a].format}\nLanguage: ${books[a].lang}\nPages: ${books[a].page}\nSize: ${books[a].size}\nYear: ${books[a].year}\n\n`
    }

    return [send, keys]
}

module.exports = {
    getBooks,
    extract
}