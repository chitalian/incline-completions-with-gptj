// import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { setTimeout } from 'timers';
const http = require('http');

const HOSTNAME = '192.168.2.244';
const PORT = '8789';
const MAX_CHARACTERS = 1024;
export function activate(context: vscode.ExtensionContext) {
	let allSuggestions = [
			'',
	];

	let disposable_1 = vscode.commands.registerCommand('extension.generateCompletions', () => {
		if(vscode.workspace.workspaceFolders !== undefined && vscode.window.activeTextEditor !== undefined) {
			let wf = vscode.workspace.workspaceFolders[0].uri.path ;
			let f = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
			let active_window = vscode.window.activeTextEditor.document.fileName;
			console.log(vscode.window.activeTextEditor.document)
			let text = vscode.window.activeTextEditor.document.getText()

			let active_line = vscode.window.activeTextEditor.selection.active.line;
			let current_chars_prev_lines = text.split('\n').map((x) => x.length + 1).slice(0,active_line).reduce((a, b) => a + b, 0)
			let current_char = current_chars_prev_lines + vscode.window.activeTextEditor.selection.active.character;
			
			let end_text = current_char
			let start_text = end_text - MAX_CHARACTERS;
			if (start_text < 0) {
				start_text = 0;
			}
			let text_to_use = text.slice(start_text, end_text)
		
			let message = `Generating Completions` ;
		
			vscode.window.showInformationMessage(message);
			
			function sleep(ms) {
				return new Promise(resolve => setTimeout(resolve, ms));
			}
			//https://stackoverflow.com/questions/38533580/nodejs-how-to-promisify-http-request-reject-got-called-two-times
			function request_completion(context) {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
					const postData = JSON.stringify({
						"params": {
							"top_k": 40,
							"top_p": 0.9,
							"temp": 0.8,
							"gen_len": 512
						},
						"body": context
					});
					const options = {
						hostname: HOSTNAME,
						port: PORT,
						path: '/',
						method: 'POST',
						headers: {
						  'Content-Type': 'application/json',
						  'Content-Length': Buffer.byteLength(postData)
						}
					};
					const req = http.request(options, (res) => {
						console.log(`STATUS: ${res.statusCode}`);
						console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
						res.setEncoding('utf8');
						res.on('data', (chunk) => {
							resolve(chunk)
						  	console.log(`BODY: ${chunk}`);
						});
						res.on('end', () => {
						  console.log('No more data in response.');
						});
						res.on('error', (e) => {
							console.error(`problem with request: ${e.message}`);
							reject(e)
						});
					});
					req.on('error', (e) => {
						console.error(`problem with request: ${e.message}`);
						reject(e);
					});
					req.write(postData);
					req.end();
					  
					}, 300);
				});

			}


			function api_call_with_base_uuid(base_uuid, api_call): Promise<String> {
				return new Promise((resolve, reject) => {
					var post_options = {
						host: HOSTNAME,
						port: PORT,
						path: `${base_uuid}/${api_call}`,
						method: 'GET',
						headers: {
							'Content-Type': 'application/text'
						}
					};
					let post_req = http.request(post_options, (res) => {
						res.setEncoding('utf8');
						res.on('data', (chunk: String) => {
							resolve(chunk);
						});
						res.on("error", (err) => {
							reject(err);
						});
					});;
					post_req.end();
				});
			}

			function get_status(base_uuid){
				return api_call_with_base_uuid(base_uuid, 'status')
			}


			function get_result(base_uuid): Promise<String> {
				return api_call_with_base_uuid(base_uuid, 'result')
			}
			async function get_completions(base_uuid): Promise<String> {
				console.log(`GOT BASE UUID of ${base_uuid}`);
				let i = 10;
				const sleep_timeout = 5000
				while ( i > 0 ) {
					let status = await get_status(base_uuid);
					let is_done = `${status}`.includes('DONE')
					if (is_done) {
						 break;
					}
					await sleep(sleep_timeout);
					i -= 1;
				}
				return await get_result(base_uuid);
			}
			let ex_context = text_to_use
			request_completion(ex_context).then( (base_uuid) => {
				get_completions(base_uuid).then((x: String) => {
					if (!x) {
						return;
					}
					let completed_item: String = x;
					if (completed_item  !== undefined) {
						vscode.window.showInformationMessage('RESULT IS READY! :D');
						let lines = ex_context.split('\n')
						let start = lines.splice(lines.length - 1)[0]
						const end_of_text_str = '<|endoftext|>'
						if (completed_item.includes(end_of_text_str)) {
							completed_item = completed_item.slice(0, completed_item.lastIndexOf(end_of_text_str));
	
						}
						allSuggestions.push(`${start}${completed_item}`)

					}

				})
			});


		} else {
			vscode.window.showInformationMessage('can not find active window!');
		}
	});

	context.subscriptions.push(disposable_1);


	const disposable = vscode.commands.registerCommand(
		'extension.inline-completion-settings',
		() => {
			vscode.window.showInformationMessage('Show settings');
		}
	);

	context.subscriptions.push(disposable);



	function longestSuffixPrefixLength(a: string, b: string): number {
		for (let i = Math.min(a.length, b.length); i > 0; i--) {
			if (a.substr(-i) == b.substr(0, i)) {
				return i;
			}
		}
		return 0;
	}

	interface CustomInlineCompletionItem extends vscode.InlineCompletionItem {
		trackingId: string;
	}

	const provider: vscode.InlineCompletionItemProvider<CustomInlineCompletionItem> = {
		provideInlineCompletionItems: async (document, position, context, token) => {
			const textBeforeCursor = document.getText(
				new vscode.Range(position.with(undefined, 0), position)
			);

			const suggestions = [...allSuggestions];

			if (context.triggerKind === vscode.InlineCompletionTriggerKind.Explicit) {
				suggestions.push('if (n < 1000) {\n}', 'helloworld2');
				await new Promise((r) => setTimeout(r, 1000));
			}

			const items = new Array<CustomInlineCompletionItem>();

			for (const s of suggestions) {
				const l = longestSuffixPrefixLength(textBeforeCursor, s);
				if (l > 0) {
					items.push({
						text: s,
						range: new vscode.Range(position.translate(0, -l), position),
						trackingId: 'some-id',
					});
				}
			}
			return { items };
		},
	};

	vscode.languages.registerInlineCompletionItemProvider({ pattern: "**" }, provider);

	// Be aware that the API around `getInlineCompletionItemController` will not be finalized as is!
	vscode.window.getInlineCompletionItemController(provider).onDidShowCompletionItem(e => {
		const id = e.completionItem.trackingId;
	});
}
