const axios = require("axios").default
const TelegramBot = require("node-telegram-bot-api")
const mongodb = require("mongodb")
const { getBooks, extract } = require("./utils")
const Crypto = require("crypto")
const { token, url, mongo_uri } = require("./secrets.json")

let client = new mongodb.MongoClient(mongo_uri, {
  useUnifiedTopology: true,
  useNewUrlParser: true
})

let options = {
  webHook: {
    port: process.env.PORT
  }
}

let bot = new TelegramBot(token, options)

// This informs the Telegram servers of the new webhook.
bot.setWebHook(`${url}/bot${token}`)

client.connect((err, client) => {

  let pages = client.db("fetch-book").collection("Pages")

  bot.on("message", (msg) => {

    if (err) {
      bot.sendMessage(msg.chat.id, "Something's wrong, but I'm working on it. Please resend your book query soon")
      return
    }

    // Sends start message
    if (msg.text === "/start") {
      bot.sendMessage(msg.chat.id, "This bot fetches download links for almost any book.\n\nCommands\n/start: View start message\n/instructions: View bot instructions\n/dev: View developer contact")
      return
    } else if (msg.text === "/instructions") {
      bot.sendMessage(msg.chat.id, "-Send a message of the name of the book that you would like to download\n-You will be replied with books that match your book query\n-Ensure you check a book's details before clicking its download link\n-The link redirects you to a website with a blue 'GET' button\n-Click the 'GET' button and your book should start downloading")
      return
    } else if (msg.text === "/dev") {
      bot.sendMessage(msg.chat.id, "Telegram: @israelsgalaxy\nEmail: izzygaladima@gmail.com")
      return
    }
    else {
      // Extract book name
      let bookName = msg.text.trim().replace(/\s+/g, "+")

      // Initialize request options
      let libgen = "http://libgen.rs/search.php?req=" + bookName + "&column=def&res=25"

      // Make request to libgen
      axios.get(libgen)
        .then((html) => {
          try {
            let books = getBooks(html.data)

            if (books.length === 0) {
              bot.sendMessage(msg.chat.id, "I didn't find any book that matches your book query")
            } else {
              let bId = Crypto.randomBytes(2).toString("hex")

              pages.insertOne({
                fid: bId,
                book: books,
                page: 0,
                createdAt: new Date()
              })
                .then((doc) => {
                  bot.sendMessage(msg.chat.id, `${books.length} results, ${Math.ceil((books.length / 5))} pages`, {
                    reply_markup: {
                      inline_keyboard: [[
                        {
                          text: "Next",
                          callback_data: `${bId}=next`
                        }, {
                          text: "Close",
                          callback_data: `${bId}=close`
                        }
                      ]]
                    }
                  })
                })
                .catch((err) => {
                  // err message
                })
            }
          } catch (error) {
            console.error(error)
            bot.sendMessage(msg.chat.id, "Something's wrong, and its either my fault or yours. I'm working at my end to fix it. You can help by resending a proper book query")
          }
        })
        .catch((error) => {
          console.error(error)
          bot.sendMessage(msg.chat.id, "The server where I get your books from banned me because it found out that I am a bot. I'd be unbanned soon. Please resend your book query soon")
        })

      return
    }
  })

  bot.on("callback_query", (cbq) => {
    let cbqdata = cbq.data.split("=")
    if (cbqdata[1] === "previous") {

      pages.findOneAndUpdate({
        fid: cbqdata[0]
      }, {
        $inc: {
          page: -1
        }
      }, {
        returnDocument: "after",
        sort: {
          createdAt: -1
        }
      })
        .then((doc) => {
          if (!doc) {
            // took too long
            bot.answerCallbackQuery(cbq.id)
            bot.deleteMessage(cbq.message.chat.id, cbq.message.message_id)
            bot.sendMessage(cbq.message.chat.id, "Your book query results were removed due to inactivity. Please resend your book query")
          } else {
            let data = extract(doc.value.book, doc.value.page, doc.value.fid)
            bot.answerCallbackQuery(cbq.id)
            bot.editMessageText(data[0], {
              chat_id: cbq.message.chat.id,
              message_id: cbq.message.message_id,
              inline_message_id: cbq.inline_message_id,
              reply_markup: {
                inline_keyboard: data[1]
              },
              disable_web_page_preview: true
            })
          }
        })
        .catch((err) => {
          bot.answerCallbackQuery(cbq.id)
          bot.deleteMessage(cbq.message.chat.id, cbq.message.message_id)
          bot.sendMessage(cbq.message.chat.id, "Your book query results were removed due to inactivity. Please resend your book query")
        })
    } else if (cbqdata[1] === "next") {

      pages.findOneAndUpdate({
        fid: cbqdata[0]
      }, {
        $inc: {
          page: 1
        }
      }, {
        returnDocument: "after",
        sort: {
          createdAt: -1
        }
      })
        .then((doc) => {
          if (!doc) {
            // took too long
            bot.answerCallbackQuery(cbq.id)
            bot.deleteMessage(cbq.message.chat.id, cbq.message.message_id)
            bot.sendMessage(cbq.message.chat.id, "Your book query results were removed due to inactivity. Please resend your book query")
          } else {
            let data = extract(doc.value.book, doc.value.page, doc.value.fid)
            bot.answerCallbackQuery(cbq.id)
            bot.editMessageText(data[0], {
              chat_id: cbq.message.chat.id,
              message_id: cbq.message.message_id,
              inline_message_id: cbq.inline_message_id,
              reply_markup: {
                inline_keyboard: data[1]
              },
              disable_web_page_preview: true
            })
          }
        })
        .catch((err) => {
          bot.answerCallbackQuery(cbq.id)
          bot.deleteMessage(cbq.message.chat.id, cbq.message.message_id)
          bot.sendMessage(cbq.message.chat.id, "Your book query results were removed due to inactivity. Please resend your book query")
        })
    } else if (cbqdata[1] === "close") {

      pages.findOneAndDelete({
        fid: cbqdata[0]
      })
        .then((doc) => {
          bot.answerCallbackQuery(cbq.id)
          bot.deleteMessage(cbq.message.chat.id, cbq.message.message_id)
        })
        .catch((err) => {
          bot.answerCallbackQuery(cbq.id)
          bot.deleteMessage(cbq.message.chat.id, cbq.message.message_id)
        })
    } else {
      bot.answerCallbackQuery(cbq.id)
      bot.deleteMessage(cbq.message.chat.id, cbq.message.message_id)
      bot.sendMessage(cbq.message.chat.id, "I received an improper book query. Please resend your book query")
    }
  })
})
