import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { FileImportModal } from "./FileImportModal";
import { EXIF_MANAGER_CONFIGS, getAllManagerIds, isManagerEnabled, getManagerStatuses } from './exif-config';

interface PixNotePluginSettings {
	imageFolder: string;
	noteFolder: string;
	// EXIF manager configurations with enabled state
	exifManagers: Record<string, boolean>;
}

const DEFAULT_SETTINGS: PixNotePluginSettings = {
	imageFolder: '',
	noteFolder: '',
	// Enable all EXIF managers by default
	exifManagers: Object.fromEntries(
    	EXIF_MANAGER_CONFIGS.map(cfg => [cfg.id, true])
	),
}

export default class PixNotePlugin extends Plugin {
	settings!: PixNotePluginSettings;


	async onload() {
		await this.loadSettings();

		this.addSettingTab(new PixNoteSettingTab(this.app, this));

		this.addCommand({
			id: 'open-file-import-modal',
			name: 'Add image with metadata',
			callback: () => {
				new FileImportModal(this.app, this).open();
			}
		});

	}

	onunload() {
		// Clear the interval when plugin is disabled
		window.clearInterval(window.setInterval(() => {}, 5 * 60 * 1000));
	}

	async loadSettings() {
		const data = await this.loadData();
		let newExifManagers = Object.assign({}, DEFAULT_SETTINGS.exifManagers);

		if (
			data &&
			Array.isArray(data.exifManagers) &&
			data.exifManagers.every((id: unknown): id is string => typeof id === 'string')
		) {
			newExifManagers = Object.fromEntries(
				data.exifManagers.map((id: string) => [id, true] as const)
			);
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, { exifManagers: newExifManagers });
		this.settings.imageFolder = data?.imageFolder || DEFAULT_SETTINGS.imageFolder;
		this.settings.noteFolder = data?.noteFolder || DEFAULT_SETTINGS.noteFolder;
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
			.setName('EXIF Extraction')
			.setDesc('Choose which types of metadata to extract from images')
			.setHeading();

		// Render a toggle for each EXIF manager
		const exifManagers = this.plugin.settings.exifManagers || {};


		EXIF_MANAGER_CONFIGS.forEach(config => {
			new Setting(containerEl)
				.setName(config.name)
				.setDesc(config.description)
				.addToggle((toggle) => {
					toggle
						.setValue(exifManagers[config.id])
						.onChange((value) => {
							this.plugin.settings.exifManagers[config.id] = value
							this.plugin.saveSettings();
						});
				});
			});


	}
}
