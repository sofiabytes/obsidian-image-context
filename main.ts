import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { FileImportModal } from "./FileImportModal";
import { EXIF_MANAGER_CONFIGS, getAllManagerIds, isManagerEnabled, getManagerStatuses } from './exif-config';

interface PixNotePluginSettings {
	imageFolder: string;
	noteFolder: string;
	// All EXIF manager IDs that should extract data
	exifManagers: string[];
}

const DEFAULT_SETTINGS: PixNotePluginSettings = {
	imageFolder: '',
	noteFolder: '',
	// Enable all EXIF managers by default
	exifManagers: getAllManagerIds()
}

export default class PixNotePlugin extends Plugin {
	settings!: PixNotePluginSettings;


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
		window.clearInterval(window.setInterval(() => {}, 5 * 60 * 1000));
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

	// ------------------------------------------------------------
	// Render settings using the official Obsidian API
	// ------------------------------------------------------------
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ============================================================
		// Image Folder
		// ============================================================

		new Setting(containerEl)
			.setName('Image Folder')
			.setDesc('Where images and PDFs are saved')
			.addText(text =>
				text
					.setValue(this.plugin.settings.imageFolder || '')
					.setPlaceholder('e.g. /images')
					.onChange((newValue) => {
						this.plugin.settings.imageFolder = newValue.trim().replace(/\/+$/, "").replace(/^\/+/, "");
						this.plugin.saveSettings();
					})
			);

		// ============================================================
		// Note Folder
		// ============================================================

		new Setting(containerEl)
			.setName('Metadata Note Folder')
			.setDesc('Where the metadata markdown notes are saved')
			.addText(text =>
				text
					.setValue(this.plugin.settings.noteFolder || '')
					.setPlaceholder('e.g. /notes')
					.onChange((newValue) => {
						this.plugin.settings.noteFolder = newValue.trim().replace(/\/+$/, "").replace(/^\/+/, "");
						this.plugin.saveSettings();
					})
			);

		// ============================================================
		// EXIF Data Extraction
		// ============================================================

		new Setting(containerEl)
			.setName('EXIF Extraction Settings')
			.setDesc('Choose which types of metadata to extract from images')
			.setHeading();

		// Render a toggle for each EXIF manager
		const enabledManagers = this.plugin.settings.exifManagers || [];
		const managerStatuses = getManagerStatuses(enabledManagers);

		EXIF_MANAGER_CONFIGS.forEach(config => {
			const isChecked = isManagerEnabled(config.id, enabledManagers);

			new Setting(containerEl)
				.setName(config.name)
				.setDesc(config.description)
				.addToggle((toggle) => {
					toggle
						.setValue(isChecked)
						.onChange((value) => {
							if (value) {
								// Add to list if not already present
								if (!enabledManagers.includes(config.id)) {
									this.plugin.settings.exifManagers = [
										...this.plugin.settings.exifManagers,
										config.id
									];
								}
							} else {
								// Remove from list
								this.plugin.settings.exifManagers =
									this.plugin.settings.exifManagers.filter(id => id !== config.id);
							}
							this.plugin.saveSettings();
						});
				});
			});

		// Log EXIF manager statuses for debugging
		console.log('EXIF Manager Statuses:', managerStatuses);
		EXIF_MANAGER_CONFIGS.forEach(config => {
			console.log(`${config.name} (${config.id}): ${managerStatuses[config.id]}`);
		});
	}
}
