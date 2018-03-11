import json
import csv

with open('code_list.txt','r',encoding='utf-8')as f:
    x = f.read().replace('[','').replace(']','').replace("'",'').replace('"','').replace('=','').replace(' ','').split(',')



content =''

for i in range(0,len(x),2):
    content = content+'{\n"synonyms": ["'+x[i]+'","'+x[i+1]+'"],\n"value": "'+x[i]+'"\n},\n'
f1 = open('codejson.json','w',encoding='utf-8')
f1.write(content)
f1.close()