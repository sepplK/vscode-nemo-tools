import * as vscode from 'vscode';
import { ThemeColor } from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const items: any [] = [];

	const updateStatus = async (repo: any) => {
		let msg;

		let repoName = repo.rootUri.path.split('/').reverse()[0];

		let status = items.find((i) => {
			return i.repo === repoName;	
		});

		let commandName = 'vscode-nemo-tools.switchuser' + repoName;

		if(!status) {
			status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 500);
			status.repo = repoName;
			status.text = `${repoName} (Benutzer wird ermittelt)`;
			status.command = commandName;

			vscode.commands.registerCommand(status.command, async (x) => {
				await switchUser(repo);		
			});

			items.push(status);
		}
		
		status.show();

		let state = 'error';
		
		try {
			let gitUser = await repo.getConfig('user.name');
			
			if(gitUser) {
				msg = gitUser;
				state = 'valid';
			} else {
				msg = 'Git User nicht gefunden';
			}

			let nemoConfig = vscode.workspace.getConfiguration('nemo');
			if(nemoConfig) {
				let nemoUsername = nemoConfig.get('username');
				if(nemoUsername) {
					if(nemoUsername !== gitUser) {
						msg = gitUser;
						status.tooltip = `Git User wechseln zu ${nemoUsername}`;
						status.command = commandName;
						state = 'warning';
					} else {
						delete status.tooltip;
						delete status.command;
					}
				} else {
					state = 'error';
					msg = 'Workspace User nicht gefunden';
				}

			}

		} catch (err) {
			msg = err.message;
		}

		status.text = `${repoName} (${msg})`;

		if(state !== 'valid') {
			status.backgroundColor = new ThemeColor(`statusBarItem.${state}Background`);
		} else {
			status.backgroundColor = undefined;
			status.tooltip = undefined;
			status.command = undefined;
		}
	};

	const switchUser = async (repo : any) => {
		
		let config = vscode.workspace.getConfiguration('nemo');

		let nemoUsername = config.get('username');
		let nemoEmail = config.get('email');

		if(!nemoUsername) {
			vscode.window.showInformationMessage(`Ungültiger Workspace`);
			return;
		}

		let gitUsername = await repo.getConfig('user.name');
		let gitEmail = await repo.getConfig('user.email');

		let modified = false;

		if(nemoUsername && gitUsername !== nemoUsername) {
			await repo.setConfig('user.name', nemoUsername);
			modified = true;
		}

		if(nemoEmail && gitEmail !== nemoEmail) {
			await repo.setConfig('user.email', nemoEmail);
			modified = true;
		}

		if(modified) {
			vscode.window.showInformationMessage(`Aktiver Git User wurde in ${nemoUsername} geändert`);
			await updateStatusAllRepos();
		}

	};

	const updateStatusAllRepos = async () => {
		let gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
		let api = gitExtension.getAPI(1);

		api.repositories.forEach(async (repo: any) => {
			updateStatus(repo);
		});	
	};

	setInterval(async () => {
		await updateStatusAllRepos();		
	}, 60000);

	setTimeout(async () => {
		await updateStatusAllRepos();
	}, 5000);

}

export function deactivate() {}