/*
 * @Author: 梁 && fang_liang_liang@foxmail.com
 * @Date: 2023-06-25 17:51:01
 * @LastEditors: 梁 && fang_liang_liang@foxmail.com
 * @LastEditTime: 2023-06-25 20:44:42
 * @FilePath: \vue-method-peek\src\goTODefinition.ts
 * @Description: 到达定义函数
 */
import {  CancellationToken, Definition, DefinitionProvider, LocationLink, Position, ProviderResult, TextDocument,TextLine,Location} from 'vscode';

export class GoToDefinition implements DefinitionProvider{
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public VUE_ATTR = {
    props: 1,
    computed: 2,
    methods: 3,
    watch: 4,
    beforeCreate: 5,
    created: 6,
    beforeMount: 7,
    mounted: 8,
    beforeUpdate: 9,
    updated: 10,
    activated: 11,
    deactivated: 12,
    beforeDestroy: 13,
    destroyed: 14,
    directives: 15,
    filters: 16,
    components: 17,
    data: 18
  };
  provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]> {
    // 获取定义word
    const line = document.lineAt(position.line);
    // 判断是文件内跳转还是文件外跳转
    let file = this.getDefinitionPosition(line.text);
    console.log('file: ', file);
    if (file) {
      // return this.definitionOutFile(document, file)
    } else {
      return this.definitionInFile(document, position, line);
    }
  }
  /**
   * 判断是文件内跳转还是文件外跳转
   * @param lineText 
   * @returns 
   */
  getDefinitionPosition(lineText: string) {
    const pathReges = [
      /import\s+.*\s+from\s+['"](.*)['"]/,
      /import\s*[^'"]*\(['"](.*)['"]\)[^'"]*/,
      /.*require\s*\([^'"]*['"](.*)['"][^'"]*\)/,
      /import\s+['"](.*)['"]/,
      /import\s*\([^'"]*(?:\/\*.*\*\/)\s*['"](.*)['"][^'"]\)*/
    ];
    let execResult: RegExpMatchArray;
    for (const pathReg of pathReges) {
      execResult = pathReg.exec(lineText) as RegExpMatchArray;
      if (execResult && execResult[1]) {
        const filePath = execResult[1];
        return {
          path: filePath
        };
      }
    }
  }
  
  /**
   * 文件内跳转
   * @param document 
   * @param position 
   * @param line 
   * @returns 
   */
  async definitionInFile(document: TextDocument, position: Position, line: TextLine){
    const textSplits = [' ', '<', '>', '"', '\'', '.', '\\', "=", ":", "@", "(", ")", "[", "]", "{", "}", ",", "!"];
    // 通过前后字符串拼接成选择文本
    let posIndex = position.character;
    let textMeta = line.text.substr(posIndex, 1);
    let selectText = '';
    // 前向获取符合要求的字符串
    while(textSplits.indexOf(textMeta) === -1 && posIndex <= line.text.length) {
      selectText += textMeta;
      textMeta = line.text.substr(++posIndex, 1);
    }
    // 往后获取符合要求的字符串
    posIndex = position.character - 1;
    textMeta = line.text.substr(posIndex, 1);
    while(textSplits.indexOf(textMeta) === -1 && posIndex > 0) {
      selectText = textMeta + selectText;
      textMeta = line.text.substr(--posIndex, 1);
    }

    // 查找字符串位置
    let pos = 0;
    // 是否开始查找
    let begin = false;
    // 当前行内容
    let lineText : any = '';
    // 代表深度
    let braceLeftCount = 0;
    // 代表当前属性，如props，data，methods等
    let attr = '';
    // 搜索类型，主要用于判断在哪个属性中去搜索内容，目前主要用于区分是否是组件
    let searchType = '';
    // 判断选择文件搜索类型，是否是标签
    if (textMeta === '<') {
      searchType = 'components';
    }
    // 一行一行的查找, 直到找到对应的属性,或者到达</script>
    while(pos < document.lineCount && !/^\s*<\/script>\s*$/g.test(lineText)) {
      // 获取当前行内容
      lineText = document.lineAt(++pos).text;
      // 从script标签开始查找
      if(!begin) {
        if(/^\s*<script.*>\s*$/g.test(lineText)) {
          begin = true;
        }
        continue; 
      }
      // 这是一个JavaScript正则表达式，用于匹配函数声明的格式。让我逐步解释它：
      // \s*：表示匹配零个或多个空白字符（包括空格、制表符、换行符等）。
      // (\w*)：表示匹配零个或多个单词字符，其中 \w 表示任何字母、数字或下划线字符。
      // \s*：再次匹配零个或多个空白字符。
      // (\(\s*\)|:|(:\s*function\s*\(\s*\)))：这是一个分组，用于匹配函数的参数列表或函数表达式的冒号。它可以匹配以下三种情况：
      // \(\s*\)：匹配空的参数列表，例如 ()。
      // :：匹配冒号，用于函数表达式。
      // (:\s*function\s*\(\s*\))：匹配带有参数列表的函数表达式，例如 function ()。其中 \s* 表示匹配零个或多个空白字符。
      // \s*：再次匹配零个或多个空白字符。
      // {：匹配左花括号。
      // \s*：再次匹配零个或多个空白字符。
      // /gi：这是正则表达式的标志部分。
      // g 表示全局匹配，即匹配字符串中的所有符合条件的部分，而不仅仅是第一个。
      // i 表示不区分大小写匹配，即在匹配时忽略大小写。
      // 判断现在正在对哪个属性进行遍历
      let keyWord:string = lineText.replace(/\s*(\w*)\s*(\(\s*\)|:|(:\s*function\s*\(\s*\)))\s*{\s*/gi, '$1');
      
      // braceLeftCount <= 3 用于去除data属性中包含vue其他属性从而不能定义问题
      if(this.VUE_ATTR[keyWord] !== undefined && braceLeftCount === 0) {
        attr = keyWord;
        braceLeftCount = 0;
      }

      if (searchType !== 'components')  {
        // data属性匹配, data具有return，单独处理
        if(attr === 'data' && braceLeftCount >= 2) {
          let matchName = lineText.replace(/\s*(\w+):.+/gi, '$1');
          if(selectText === matchName && braceLeftCount === 2) {
            return Promise.resolve(new Location(document.uri, new Position(pos, lineText.indexOf(matchName) + matchName.length)));
          }
          let braceLeft = lineText.match(/{/gi) ? lineText.match(/{/gi).length : 0;
          let braceRight = lineText.match(/}/gi) ? lineText.match(/}/gi).length : 0;
          braceLeftCount += braceLeft - braceRight;
        } else if(attr) {
          
          let matchName = lineText.replace(/\s*(async\s*)?(\w*)\s*(:|\().*/gi, '$2');
          if(selectText === matchName && braceLeftCount === 1) {
            // 找到跳到新的位置
            return Promise.resolve(new Location(document.uri, new Position(pos, lineText.indexOf(matchName) + matchName.length)));
          }
          // 匹配{ 和 }的数量
          let braceLeft = lineText.match(/{/gi) ? lineText.match(/{/gi).length : 0;
          let braceRight = lineText.match(/}/gi) ? lineText.match(/}/gi).length : 0;
          // 更新当前的深度
          braceLeftCount += braceLeft - braceRight;
        }

        // data取return的属性值
        if(attr === 'data') {
          if(/\s*return\s*{\s*/gi.test(lineText)) {
            braceLeftCount = 2;
          }
        }
      }
    }
    return Promise.resolve(null);
  }
}

