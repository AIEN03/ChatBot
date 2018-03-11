
//import module
var restify = require("restify");
var builder = require("botbuilder");
//setup web server
var server = restify.createServer();
var fs = require("fs");
var iconv = require('iconv-lite');
var request = require("request");
// require('./jieba-js-master/scripts/main.js');
// dict1 = require('./jieba-js-master/scripts/data/dictionary.js');
// dict2 = require('./jieba-js-master/scripts/data/dict_custom.js');
var cheerio = require("cheerio");
server.listen(3978, function () {
    console.log("%s listening to %s", server.name, server.url);
});
var connector = new builder.ChatConnector({
    appId: "",
    appPassword: "",
});
server.post("/api/messages", connector.listen());
//create chat connector for communicating with the Bot Servic
var bot = new builder.UniversalBot(connector, [
    function (session) {
        fs.readFile('code_list.txt', 'utf8', function (err, data) {
            ll = data.toString()
            ll = ll.split(',')

        })
        // session.beginDialog("stock_code1")
        session.beginDialog('dialogflow')
    }
]);
bot.dialog('dialogflow', [
    function (session) {
        session.conversationData.stock = { intent: '', cname: '', code: '', date: '' }
        if (session.conversationData.stock && session.conversationData.stock.retry) {
            builder.Prompts.text(session, '請重新輸入')
        } else {
            builder.Prompts.text(session, '請輸入')
        }
    },
    function (session, results) {
        session.conversationData.stock = { intent: '', cname: '', code: '', date: '' }
        var apiai = require('apiai');

        var app = apiai("f06f9de521fa4772a8885460aebd8750");

        var request = app.textRequest(results.response, {
            sessionId: '<unique session id>'
        });
        request.on('response', function (response) {
            console.log(response.result)
            
            try {
                session.conversationData.stock.code = response.result.parameters.cname[0];
                session.conversationData.stock.date = response.result.parameters.date;
                session.conversationData.stock.intent = response.result.parameters.stockintent;
            } catch (err) {
                console.log(err)
            }
            if (session.conversationData.stock.code != '' && typeof(session.conversationData.stock.code) !='undefined') {
                if (session.conversationData.stock.intent != '') {
                    session.replaceDialog('codeidentify')
                } else {
                    session.replaceDialog('stock_function')
                }
            } else {
                if (session.conversationData.stock.intent != '' && typeof(session.conversationData.stock.intent) !='undefined') {
                    session.replaceDialog('stock_code1')
                } else {
                    session.send('不好意思我聽不懂')
                    session.conversationData.stock.retry = true
                    session.replaceDialog('dialogflow')
                }
            }
        });
        request.on('error', function (error) {
            console.log(error);
        });
        request.end();
    }
])
bot.dialog('intent', [
    function (session) {
        console.log(session.conversationData.stock)
        if (session.conversationData.stock.intent != '') {
            var intent = session.conversationData.stock.intent
            var code = session.conversationData.stock.code
            if (intent != '' && code != '') {
                an = intent

                if (an == '新聞') {
                    session.replaceDialog('newsyahoo')
                } else if (an == '法人') {
                    session.replaceDialog('fore_fund_indi')
                } else if (an == '財報') {
                    session.replaceDialog('statement')
                } else if (an == '股價') {
                    session.replaceDialog('stockprice')
                } else if (an == '重大訊息') {
                    session.replaceDialog('announcement')
                } else if (an == '查詢別支股票') {
                    session.replaceDialog('stock_code1')
                } 
            }
        }

    }
])
bot.dialog("stockprice", [
    function (session, results, next) {
        console.log(session.conversationData.stock)
        if (session.conversationData.stock.date == '') {
            builder.Prompts.choice(session, '請選擇查詢內容', ['即時股價', '歷史股價'], { listStyle: builder.ListStyle.button })
        } else {
            next();
            //及時股價
        }
    },
    function (session, results, next) {

        var today = session.message.timestamp.replace("'", '').split('T')[0]
        var tl = today.split('-')
        var dl = session.conversationData.stock.date.split('-')
        var rrrr = 0
        for (var i = 0; i < tl.length; i++) {
            if (tl[i] == dl[i]) {
                rrrr++
            }
        }
        if (results.response && results.response.entity == '即時股價') {
            var url = "https://tw.stock.yahoo.com/q/q?s=" + session.conversationData.stock.code
            request({ url: url, encoding: null }, function (err, response, body) {
                if (!err && response.statusCode == 200) {
                    var str = iconv.decode(new Buffer(body), "big5");
                    const $ = cheerio.load(str)
                    var x = $('table[border=2]').text().replace(/ /g, '').replace('加到投資組合', '')
                    var li = x.split('\n')
                    var li1 = new Array;
                    var msg = ''
                    for (var i = 0; i < li.length; i++) {
                        if (li[i].length > 1 && li[i].length < 18) {
                            li1.push(li[i])
                        }
                    }
                    console.log(li)
                    if(li!=''){
                        for (var i = 0; i < 11; i++) {
                            msg = msg + li1[i] + ":" + li1[i + 12] + '<br>'
                        }
                    } else{
                        msg ='查詢不到您要的資料'
                    }
                    
                    session.send('即時股價:<br>' + msg)
                    session.replaceDialog('stock_function')
                }
            });
        }
        else if (rrrr != 3) {
            next();
        } else if (results.response && results.response.entity == '歷史股價') {

            next();
        } else {
            session.send('請重新輸入')
            session.replaceDialog('dialogflow')
        }
    }, function (session, results, next) {
        if (session.conversationData.stock.date == '') {
            builder.Prompts.time(session, '請輸入日期(2013以後)')
        } else {
            next()
        }
    },
    function (session, results) {
        if (session.conversationData.stock.date == '') {
            var tt = builder.EntityRecognizer.resolveTime([results.response])
            if (tt.getFullYear() < 2013) {
                session.replaceDialog('stockprice')
            } else {
                var m = tt.getMonth() + 1
                var da = tt.getDate()
                if (m < 10) {
                    m = '0' + m
                }
                if (da < 10) {
                    da = '0' + da
                }
                var y = tt.getFullYear().toString()
                var dd = y + m + da
            }
        } else {
            var date = session.conversationData.stock.date
            li = date.split('-')
            var y = li[0]
            var m = li[1]
            var da = li[2]
            dd = y + m + da
        }

        var msg = ''
        url = 'http://www.tse.com.tw/exchangeReport/STOCK_DAY?response=html&date=' + dd + '&stockNo=' + session.conversationData.stock.code
        request({ url: url, encoding: null }, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                var str = iconv.decode(new Buffer(body), "big5");
                const $ = cheerio.load(str)
                var x = $('tbody').text().replace(/ /g, '')
                var li = x.split('\n')
                var li1 = new Array;
                for (i in li) {
                    if (li[i].length != 0) {
                        li1.push(li[i])
                    }
                }

                for (var ii = 0; ii < li1.length; ii = ii + 9) {
                    dl = li1[ii].split('/')
                    if (dl[2] == da && dl[1] == m && dl[0] == (y - 1911)) {
                        msg = `日期:${li1[ii]}<br>成交股數:${li1[ii + 1]}<br>成交金額:${li1[ii + 2]}<br>開盤價:${li1[ii + 3]}<br>最高價:${li1[ii + 4]}<br>最低價:${li1[ii + 5]}<br>收盤價:${li1[ii + 6]}<br>漲跌價差:${li1[ii + 7]}<br>成交筆數:${li1[ii + 8]}<br><br>`
                    }
                }
                if (msg == '') {
                    msg = '查詢不到'
                }
                var cname = session.conversationData.stock.cname
                session.send(cname + '歷史股價:<br>' + msg)
                session.conversationData.date = ''
                session.replaceDialog('stock_function')
            }
        });
    }
]);

bot.dialog('statement', [
    function (session) {
        builder.Prompts.choice(session, '選擇年分', ['2012', '2013', '2014', '2015', '2016', '2017'], { listStyle: builder.ListStyle.button })
    }, function (session, results) {
        session.dialogData.year = results.response.entity
        builder.Prompts.choice(session, '請選擇季度', ['q1', 'q2', 'q3', 'q4'], { listStyle: builder.ListStyle.button })
    }, function (session, results) {
        session.dialogData.q = results.response.entity
        builder.Prompts.choice(session, '請選擇財報類型', ['綜合損益表', '資產負債表'], { listStyle: builder.ListStyle.button })
    },
    function (session, results) {
        if (results.response.entity == '綜合損益表') {
            var fn = 'is'
            var folder = 'is_statement_json'
            var nu = 3
        } else {
            var fn = 'bs'
            var nu = 8
            var folder = 'bs_statement_json'
        }

        var stocktext = "";
        var q = session.dialogData.q
        var y = session.dialogData.year
        try {
            var isss = require('./data/' + folder + '/' + y + q + '' + fn + '.json')
            var com = session.conversationData.stock.code;
            var bbb = isss.columns;
            var aaa = ''
            
            for (var i = 0; i <= isss.data.length; i++) {
                if (isss.data[i] != 'undefined' && isss.data[i][nu] == com) {
                    aaa = isss.data[i]
                    var count = 0
                    
                    aaa.forEach(element => {
    
                        if (element != null) {
                            stocktext += isss.columns[count] + " : " + element + "<br/>"
    
                        }
                        count++
                    });

                    session.send("報表(仟元表達)如下<br/>" )
                   
                    
                    
                }
    
            }        
        
        
        
        } catch (err) {
            console.log(err)


            
             if (stocktext.length<20){
                 
                         session.send('財報尚未出爐')
                    }else{}
            
           
        } 
    session.send( stocktext)
        session.replaceDialog('stock_function')
        
    }
])
bot.dialog('AllStock',[function(session){
    builder.Prompts.choice(session,'選擇線型', ['日線','周線','月線'],{ listStyle: builder.ListStyle.button })
    },
    function(session , results){
        if(results.response.entity == '日線'){
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
            .title()
            .subtitle()
            .text()

            .images([builder.CardImage.create(session,
            "https://stock.wearn.com/finance_chart.asp?stockid=IDXWT&timekind=0&timeblock=90&sma1=&sma2=&sma3=&volume=0&indicator1=SStoch&indicator2=MACD&indicator3=Vol")])

    

        msg.addAttachment(heroCard);
        session.send(msg);
        session.replaceDialog('stock_function')
        }else if(results.response.entity == '周線'){
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
            .title()
            .subtitle()
            .text()

            .images([builder.CardImage.create(session,
            "https://stock.wearn.com/finance_wchart.asp?stockid=IDXWT&timekind=1&timeblock=1&sma1=&sma2=&sma3=&volume=0&indicator1=SStoch&indicator2=MACD&indicator3=Vol")])

            msg.addAttachment(heroCard);
            session.send(msg);
            session.replaceDialog('stock_function')
        }else if(results.response.entity == '月線'){
            var msg = new builder.Message(session);
            var heroCard = new builder.HeroCard(session)
            .title()
            .subtitle()
            .text()

            .images([builder.CardImage.create(session,
            "https://stock.wearn.com/finance_mchart.asp?stockid=IDXWT&timekind=2&timeblock=0&sma1=&sma2=&sma3=&volume=0&indicator1=SStoch&indicator2=MACD&indicator3=Vol")])
                msg.addAttachment(heroCard);
                session.send(msg);
                session.replaceDialog('stock_function')
        }
    }
])

bot.dialog('K-line',function(session){
    var msg = new builder.Message(session);
    var heroCard = new builder.HeroCard(session)
        .title()
        .subtitle()
        .text()

        .images([builder.CardImage.create(session,
        "https://stock.wearn.com/finance_chart.asp?stockid="+ session.conversationData.stock.code +"&timekind=0&timeblock=90&sma1=&sma2=&sma3=&volume=0&indicator1=SStoch&indicator2=MACD&indicator3=Vol")])
    

    msg.addAttachment(heroCard);
    session.send(msg);
    session.replaceDialog('stock_function')
})
bot.dialog('margin_purchase',function(session){
var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel);
    msg.attachments([
        new builder.HeroCard(session)
            .title("融資 融券")
            .subtitle()
            .text()

            .images([builder.CardImage.create(session,
            "https://stock.wearn.com/acre.asp?stockid="+ session.conversationData.stock.code +"&tickstamp=1520520781")]),

       
        
        new builder.HeroCard(session)
            .title("主力持股")
            .subtitle()
            .text()

            .images([builder.CardImage.create(session,
            "https://stock.wearn.com/zhuli_chart.asp?stockid="+ session.conversationData.stock.code)])

        
        ]);
        session.send(msg);
        session.replaceDialog('stock_function')
        })

// bot.dialog('margin_purchase',function(session){
//     var msg = new builder.Message(session);
//     var heroCard = new builder.HeroCard(session)
//         .title()
//         .subtitle()
//         .text()

//         .images([builder.CardImage.create(session,
//         "https://stock.wearn.com/acre.asp?stockid="+ session.conversationData.stock.code +"&tickstamp=1520520781")])
    

//     msg.addAttachment(heroCard);
//     session.send(msg);
//     session.replaceDialog('stock_function')
// })

bot.dialog('newsyahoo', [
    function (session) {
        var url = "https://tw.stock.yahoo.com/q/h?s=" + session.conversationData.stock.code
        request({ url: url, encoding: null }, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                var str = iconv.decode(new Buffer(body), "big5");
                var str1 = str.split('<td height="37" valign="bottom"><a href="')
                var li = new Array;
                for (var i = 0; i < str1.length; i++) {
                    li.push(str1[i].split('</a></td>')[0].split('">'))
                }
                var msg = ''
                if(li!=''){
                    for (var i = 2; i < str1.length; i++) {
                        var ti = li[i][1]
                        var link = 'https://tw.stock.yahoo.com' + li[i][0]
                        msg = msg + ti + '<br>' + link + '<br>'
                    }
                } else {
                    msg = '查詢不到您要的資料'
                }
                session.send('最近新聞:<br>' + msg)
                session.replaceDialog('stock_function')
            }
        });

    }
])
bot.dialog('stock_function', [
    function (session) {

        builder.Prompts.choice(session, `請選擇您要查詢${session.conversationData.stock.cname}的內容`, ['大盤','股價', 'k線圖', '財報', '近期新聞', '重大訊息', '法人買賣超','融資融券、主力', '查詢別支股票'], { listStyle: builder.ListStyle.button })
    }, function (session, results) {

        an = results.response.entity
        if (an == '近期新聞') {
            session.replaceDialog('newsyahoo')
        } else if (an == '法人買賣超') {
            session.replaceDialog('fore_fund_indi')
        } else if (an == '財報') {
            session.replaceDialog('statement')
        } else if (an == '股價') {
            session.replaceDialog('stockprice')
        } else if (an == '重大訊息') {
            session.replaceDialog('announcement')
        } else if (an == '查詢別支股票') {
            session.replaceDialog('dialogflow')
        } else if (an == '融資融券、主力'){
            session.replaceDialog('margin_purchase')
        } else if (an == 'k線圖'){
            session.replaceDialog('K-line')
        } else if (an == '大盤'){
            session.replaceDialog('AllStock')
        }
    }
])
bot.dialog('announcement', [
    function (session) {

        builder.Prompts.choice(session, '請選擇年份', ['2018', '2017', '2016', '2015'], { listStyle: builder.ListStyle.button })
    }, function (session, results) {
        session.dialogData.y = results.response.entity
        builder.Prompts.choice(session, '請選擇月份', ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], { listStyle: builder.ListStyle.button })
    },
    function (session, results) {
        session.dialogData.m = results.response.entity

        days = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']
        var statement_msg = ''
        var statement_list = new Array()
        var y = session.dialogData.y;
        var m = session.dialogData.m;
        var code = session.conversationData.stock.code
        var res = false
        for (var j = 0; j < 31; j++) {
            try {
                var statement = require('./data/' + y + '/' + y + '_statement_json/' + y + m + days[j] + '.json')
                var key_list = Object.keys(statement)
                for (var k = 0; k < key_list.length; k++) {
                    if (key_list[k].search(code) != -1) {
                        statement_list.push(statement[key_list[k]])
                    }
                }
            } catch (err) {
                
                
                
            }
        }
        if(res){
            for (var i = 0; i < statement_list.length; i++) {
                var x = statement_list[i]
                session.send(`日期:${x.date}<br>時間:${x.time}<br>標題:${x.title}<br>生效日期:${x.date_happened}<br>內容:<br>${x.content}`)
            }
        }  else {
            session.send('沒有重大訊息')
        }
        session.replaceDialog('stock_function')
        
    }
])
bot.dialog("fore_fund_indi", [
    function (session, results, next) {

        if (session.conversationData.stock.date == '') {
            builder.Prompts.time(session, '請輸入日期')
        }
        else {
            next()
        }
    },
    function (session, results) {
        console.log(session.conversationData.stock)
        if (session.conversationData.stock.date == '') {
            var tt = builder.EntityRecognizer.resolveTime([results.response])
            var m = tt.getMonth() + 1
            var da = tt.getDate()
            if (m < 10) {
                m = '0' + m
            }
            if (da < 10) {
                da = '0' + da
            }
            var y = tt.getFullYear().toString()
            var dd = y + m + da
            console.log(dd)
        }
        else {
            var date = session.conversationData.stock.date
            li = date.split('-')
            var y = li[0]
            var m = li[1]
            var da = li[2]
            dd = y + m + da
        }

        var url = 'http://www.twse.com.tw/fund/T86?response=json&date=' + dd + '&selectType=ALL'
        request({ url: url, encoding: null }, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                var str = iconv.decode(new Buffer(body), "utf8");
                var content = JSON.parse(str)
                var msg = ''
                var cc;
                var fields = content.fields;
                var res = false
                if (content.data && content.data != '') {
                    for (var i = 0; i < content.data.length; i++) {
                        try {
                            var code = content.data[i][0]
                            if (parseInt(code) == parseInt(session.conversationData.stock.code)) {
                                cc = content.data[i]
                                console.log(cc)
                                res = true
                                break
                            }
                        } catch (err) {
                        }
                    }
                    if (res) {
                        for (var ii = 1; ii < 20; ii++) {
                            msg = msg + fields[ii] + ':' + cc[ii] + '<br>'
                        }
                    } else {
                        msg = '無法查詢到您要的內容'
                    }
                } else {
                    msg = '很抱歉，目前線上人數過多，請您稍候再試'
                }
                session.send(msg)
            }
        })
        // session.send("您查詢的股票資訊如下<br/>\(外資\)<br/>%s<br/>\(投信\)<br/>%s<br/>\(自營商\)<br/>%s", msg_fore, msg_fund, msg_indi);



        session.replaceDialog('stock_function')

    }
]);
bot.dialog('codeidentify', [
    function (session) {
        var code = session.conversationData.stock.code
        var n = -1;
        if (code != '') {
            for (var i = 0; i < ll.length; i = i + 2) {
                c = ll[i].split("'")[1]
                if (c == code) {
                    session.conversationData.stock.cname = ll[i + 1].split("'")[1]
                    break
                }
            }
        }
        console.log(session.conversationData.stock)
        session.replaceDialog('intent')
    }



])
bot.dialog('stock_code1', [
    function (session) {
        builder.Prompts.text(session, '請輸入您要查詢的股票')
    }, function (session, results) {
        var res = false
        var r = results.response;
        var rr = r.match(/\d{4}/ig);
        var n = -1;
        
        if (rr != null) {
            for (var i = 0; i < ll.length; i = i + 2) {
                c = ll[i].split("'")[1]
                
                if (c == rr) {
                    console.log(123)
                    session.conversationData.stock.code = ll[i].split("'")[1]
                    session.conversationData.stock.cname = ll[i + 1].split("'")[1]
                    if (session.conversationData.stock.code.search('"') != -1) {
                        session.conversationData.stock.code = session.conversationData.stock.code.split('"')[1]
                    }
                    res = true
                    break
                }
            }
            if (res){
                session.replaceDialog('intent')
            } else {
                session.send('找不到您所輸入的內容')
                session.replaceDialog('stock_code1')
            }
            
        } else {
                for (var i = 1; i < ll.length; i = i + 2) {
                    c = ll[i].split("'")[1]
                    if (c == r) {
                        session.conversationData.stock.cname = ll[i].split("'")[1]
                        session.conversationData.stock.code = ll[i - 1].split("'")[1]
                        if (session.conversationData.stock.code.search('"') != -1) {
                            session.conversationData.stock.code = session.conversationData.stock.code.split('"')[1]
                        }
                        console.log(session.conversationData.stock)
                        res = true
                        break
                    } 
                }
                if (res){
                    session.replaceDialog('intent')
                } else {
                    session.send('找不到您所輸入的內容')
                session.replaceDialog('stock_code1')
                }
                
            }
           
           
            
        
    },
    function (session, results) {
        con = results.response.entity;
        if (con == '是') {
            session.replaceDialog('stock_function')
        } else {
            session.replaceDialog('stock_code1')
        }
    }
])






