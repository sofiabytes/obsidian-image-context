import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { FileImportModal } from "./FileImportModal"

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	imageFolder: string;
	noteFolder: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	imageFolder: '',
	noteFolder: ''
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'open-file-import-modal',
			name: 'Add image with metadata',
			callback: () => {
				new FileImportModal(this.app, this).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Image Folder')
			.setDesc('Where images and PDFs are saved')
			.addText(text => text
				.setPlaceholder('folder/path')
				.setValue(this.plugin.settings.imageFolder)
				.onChange(async (value) => {
					this.plugin.settings.imageFolder = value.trim().replace(/\/+$/, "").replace(/^\/+/, "");
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Metadata Note Folder')
			.setDesc('Where the metadata markdown notes are saved')
			.addText(text => text
				.setPlaceholder('folder/path')
				.setValue(this.plugin.settings.noteFolder)
				.onChange(async (value) => {
					this.plugin.settings.noteFolder = value.trim().replace(/\/+$/, "").replace(/^\/+/, "");
					await this.plugin.saveSettings();
				}));
	}
}
