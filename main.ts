import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { FileImportModal } from "./FileImportModal"

interface PixNotePluginSettings {
	imageFolder: string;
	noteFolder: string;
	extractExif: boolean;
}

const DEFAULT_SETTINGS: PixNotePluginSettings = {
	imageFolder: '',
	noteFolder: '',
	extractExif: true
}

export default class PixNotePlugin extends Plugin {
	settings: PixNotePluginSettings;

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
		this.addSettingTab(new PixNoteSettingTab(this.app, this));

	}

	onunload() {
		// Clear the interval when plugin is disabled
		window.clearInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PixNoteSettingTab extends PluginSettingTab {
	plugin: PixNotePlugin;

	constructor(app: App, plugin: PixNotePlugin) {
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
		
		new Setting(containerEl)
			.setName('Extract EXIF Data')
			.setDesc('Automatically extract date and location from image metadata')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.extractExif)
				.onChange(async (value) => {
					this.plugin.settings.extractExif = value;
					await this.plugin.saveSettings();
				}));
	}
}
