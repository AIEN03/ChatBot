import os
path = 'data/'
fn = 'code_list.txt'
li = []
li1=[]
with open(path+fn,'r',encoding='utf-8') as f:
    text = f.read().replace('[','').replace(']','').replace("'",'')
    text = text.split(',')
    
    for i in range(1,len(text),2):
        li.append(text[i])
for i in li:
    li2 = []
    li2.append(i.replace(' ',''))
    li2.append(500)
    li2.append("n")
    li1.append(li2)
# f1 = open(path+'jieba.txt','w',encoding='utf-8')
# f1.write(str(li1))
# f1.close()