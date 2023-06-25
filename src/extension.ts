// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GoToDefinition } from './goToDefinition';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// 到达定义函数
	let vueGoToDefinition = vscode.languages.registerDefinitionProvider(['vue', 'javascript', 'html'], new GoToDefinition());
		context.subscriptions.push(vueGoToDefinition);
}

// This method is called when your extension is deactivated
export function deactivate() {}
