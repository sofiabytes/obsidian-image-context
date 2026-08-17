import { App, Modal, ButtonComponent, TFolder, TextComponent, DropdownComponent, Notice, normalizePath, TFile } from "obsidian";
import type MyPlugin from "./main";
import ExifReader from 'exifreader';

export class FileImportModal extends Modal {
	plugin: MyPlugin;
	selectedFile: File | null;
	tags: string;
	source: string;
	description: string;
	imageDestFolder: string;
	noteDestFolder: string;
	extractExif: boolean;
	
	// EXIF data
	exifDate: string;
	exifLocation: string;
	latitude: string;
	longitude: string;

	constructor(app: App, plugin: MyPlugin) {
		super(app);
		this.plugin = plugin;
		this.selectedFile = null;
		this.tags = "";
		this.source = "";
		this.description = "";
		this.imageDestFolder = this.plugin.settings.imageFolder || "";
		this.noteDestFolder = this.plugin.settings.noteFolder || "";
		this.extractExif = this.plugin.settings.extractExif || false;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Add Image or PDF with Metadata" });

		// === File Picker ===
		const fileInput = createEl("input", {
			attr: {
				type: "file",
				accept: ".jpg,.jpeg,.png,.gif,.pdf",
				style: "display: none",
			},
		});

		// Display element
		const fileNameEl = contentEl.createEl("div", {
			text: "No file selected",
			cls: "selected-file-name",
		});

		fileInput.onchange = async () => {
			if (fileInput.files && fileInput.files.length > 0) {
				this.selectedFile = fileInput.files[0];
				new Notice(`Selected file: ${this.selectedFile.name}`);
				fileNameEl.setText(this.selectedFile.name);
				if (this.extractExif && this.selectedFile.type.includes("image")) {
					await this.extractExifData(this.selectedFile);
				}
			}
		};

		new ButtonComponent(contentEl)
			.setButtonText("Select File")
			.onClick(() => fileInput.click());

		contentEl.appendChild(fileInput);
		contentEl.appendChild(fileNameEl);

		contentEl.createEl("br");
		contentEl.createEl("br");

		// === Folders ===
		const folders = this.getAllFolders();
		
		// Add configured folders to the list if they don't exist yet
		if (this.imageDestFolder !== "" && !folders.includes(this.imageDestFolder)) {
			folders.push(this.imageDestFolder);
		}
		if (this.noteDestFolder !== "" && !folders.includes(this.noteDestFolder)) {
			folders.push(this.noteDestFolder);
		}
		// Sort folders alphabetically
		folders.sort();

		// Image Folder Dropdown
		contentEl.createEl("label", { text: "Save image in:" });
		const imageFolderDropdown = new DropdownComponent(contentEl);
		for (const folderPath of folders) {
			imageFolderDropdown.addOption(folderPath, folderPath === "" ? "/ (Root)" : folderPath);
		}
		if (folders.includes(this.imageDestFolder)) {
			imageFolderDropdown.setValue(this.imageDestFolder);
		} else {
			imageFolderDropdown.setValue("");
		}
		imageFolderDropdown.onChange(value => {
			this.imageDestFolder = value;
		});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// Note Folder Dropdown
		contentEl.createEl("label", { text: "Save metadata note in:" });
		const noteFolderDropdown = new DropdownComponent(contentEl);
		for (const folderPath of folders) {
			noteFolderDropdown.addOption(folderPath, folderPath === "" ? "/ (Root)" : folderPath);
		}
		if (folders.includes(this.noteDestFolder)) {
			noteFolderDropdown.setValue(this.noteDestFolder);
		} else {
			noteFolderDropdown.setValue("");
		}
		noteFolderDropdown.onChange(value => {
			this.noteDestFolder = value;
		});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// === EXIF Data Display ===
		if (this.extractExif && this.selectedFile?.type.includes("image")) {
			contentEl.createEl("h3", { text: "Extracted EXIF Data" });
			
			const exifContainer = contentEl.createEl("div", { cls: "exif-container" });
			
			if (this.exifDate) {
				exifContainer.createEl("p", { text: `📅 Date Taken: ${this.exifDate}` });
			} else {
				exifContainer.createEl("p", { text: "📅 Date: Not available" });
			}
			
			if (this.latitude && this.longitude) {
				const latLongText = `📍 Location: ${this.latitude}, ${this.longitude}`;
				exifContainer.createEl("p", { text: latLongText });
				
				const mapsLink = contentEl.createEl("a", {
					text: "Open in Maps Plugin",
					cls: "exif-maps-link",
					href: `obsidian://plugin-exif-location?lat=${this.latitude}&lng=${this.longitude}`
				});
				mapsLink.addEventListener('click', (e) => {
					e.preventDefault();
					new Notice("Location data saved. Check the Maps plugin for location markers.");
				});
			} else {
				exifContainer.createEl("p", { text: "📍 Location: Not available" });
			}
		}

		contentEl.createEl("br");
		contentEl.createEl("br");

		// === Tags Input ===
		contentEl.createEl("label", { text: "Tags (comma-separated):" });

		new TextComponent(contentEl)
			.setPlaceholder("e.g. reading,quote")
			.onChange(value => {
				this.tags = value;
			});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// === Source Input ===
		contentEl.createEl("label", { text: "Source (URL or Reference):" });
		new TextComponent(contentEl)
			.setPlaceholder("e.g. https://example.com")
			.onChange(value => {
				this.source = value;
			});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// === Description Input ===
		contentEl.createEl("label", { text: "Description:" });
		const descriptionEl = contentEl.createEl("textarea", {
			attr: {
				rows: "4",
				style: "width: 100%;",
				placeholder: "Enter description here..."
			}
		});
		descriptionEl.oninput = (e) => {
			this.description = (e.target as HTMLTextAreaElement).value;
		};

		contentEl.createEl("br");
		contentEl.createEl("br");

		// === Create File Button ===
		new ButtonComponent(contentEl)
			.setButtonText("Create File")
			.setCta()
			.onClick(async () => {
				if (!this.selectedFile) {
					new Notice("Please select a file first.");
					return;
				}

				const savedPath = await this.saveFileToVault(this.app, this.selectedFile, this.imageDestFolder);
				const tagArray = this.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
				const mdPath = await this.createMarkdownWithMetadata(
					this.app,
					savedPath,
					this.noteDestFolder,
					tagArray,
					this.source,
					this.description
				);

				const mdFile = this.app.vault.getAbstractFileByPath(mdPath);
				if (mdFile instanceof TFile) {
					await this.app.workspace.getLeaf('tab').openFile(mdFile);
				}
				
				new Notice(`File saved to ${savedPath} and note created at ${mdPath}`);
				this.close();
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	getAllFolders(): string[] {
		const folders: string[] = [];

		const walk = (folder: TFolder) => {
			folders.push(folder.path);
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					walk(child);
				}
			}
		};

		walk(this.app.vault.getRoot());
		return folders;
	}

	async saveFileToVault(
		app: App,
		file: File,
		destFolder: string
	): Promise<string> {
		const arrayBuffer = await file.arrayBuffer();
		const folderPath = normalizePath(destFolder);
	
		// Ensure folder exists
		if (folderPath !== "" && !(await app.vault.adapter.exists(folderPath))) {
			await app.vault.createFolder(folderPath).catch(() => {});
		}
	
		// Make sure file name is unique
		let filePath = normalizePath(`${folderPath}/${file.name}`);
		let counter = 1;
		const fileExt = file.name.split('.').pop();
		const fileBase = file.name.substring(0, file.name.lastIndexOf('.'));
		while (await app.vault.adapter.exists(filePath)) {
			filePath = normalizePath(`${folderPath}/${fileBase}-${counter}.${fileExt}`);
			counter++;
		}
	
		await app.vault.createBinary(filePath, arrayBuffer);
		return filePath;
	}

	async extractExifData(file: File): Promise<void> {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			
			const tags = ExifReader.load(buffer);
			console.log("EXIF tags:", tags);
			
			// Extract date
			if (tags.DateTaken && tags.DateTaken.Date) {
				this.exifDate = tags.DateTaken.Date;
			} else if (tags.DateTimeOriginal && tags.DateTimeOriginal.DateTimeOriginal) {
				this.exifDate = tags.DateTimeOriginal.DateTimeOriginal;
			} else if (tags.DateTime && tags.DateTime.DateTime) {
				this.exifDate = tags.DateTime.DateTime;
			} else {
				this.exifDate = "Not available";
			}
			
			// Extract location coordinates
			if (tags.GPSLatitude && tags.GPSLatitude.value) {
				const latitude = tags.GPSLatitude.value;
				const ref = tags.GPSLatitude.ref;
				const latDir = ref[latitude.length - 1] || 'N';
				const latVal = parseFloat(latitude.slice(0, latitude.length - 1));
				this.latitude = `${latDir}${latVal}`;
			}
			
			if (tags.GPSLongitude && tags.GPSLongitude.value) {
				const longitude = tags.GPSLongitude.value;
				const ref = tags.GPSLongitude.ref;
				const lngDir = ref[longitude.length - 1] || 'E';
				const lngVal = parseFloat(longitude.slice(0, longitude.length - 1));
				this.longitude = `${lngDir}${lngVal}`;
			}
			
			console.log(`EXIF Date: ${this.exifDate}`);
			console.log(`EXIF Latitude: ${this.latitude}`);
			console.log(`EXIF Longitude: ${this.longitude}`);
		} catch (error) {
			console.error("Error extracting EXIF data:", error);
			this.exifDate = "Not available";
			this.latitude = "";
			this.longitude = "";
		}
	}

	async createMarkdownWithMetadata(
		app: App,
		imagePath: string,
		destFolder: string,
		tags: string[],
		source: string,
		description: string
	): Promise<string> {
		const fileName = imagePath.split("/").pop()!;
		const fileNameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
		const mdFileName = `${fileNameWithoutExtension}.md`;
		const folderPath = normalizePath(destFolder);

		// Ensure folder exists
		if (folderPath !== "" && !(await app.vault.adapter.exists(folderPath))) {
			await app.vault.createFolder(folderPath).catch(() => {});
		}

		const mdFilePath = normalizePath(`${folderPath}/${mdFileName}`);
		let finalMdFilePath = mdFilePath;
		let counter = 1;
		while (await app.vault.adapter.exists(finalMdFilePath)) {
			finalMdFilePath = normalizePath(`${folderPath}/${fileNameWithoutExtension}-${counter}.md`);
			counter++;
		}

		// Prepare frontmatter for Maps plugin compatibility
		const frontmatterLines = [
			"---",
		];
		
		// Add tags
		if (tags.length > 0) {
			frontmatterLines.push(`tags: [${tags.map(t => t.trim()).filter(Boolean).join(", ")}]`);
		}
		
		// Add date from EXIF if available
		if (this.exifDate && this.extractExif) {
			// Parse date and format for Obsidian
			const dateObj = new Date(this.exifDate);
			const formattedDate = dateObj.toISOString();
			frontmatterLines.push(`created: ${formattedDate}`);
			frontmatterLines.push(`created-time: ${this.exifDate}`);
		}
		
		// Add location data for Maps plugin (compatible format: lat + lng)
		if (this.latitude && this.longitude && this.extractExif) {
			frontmatterLines.push(`latitude: ${this.latitude}`);
			frontmatterLines.push(`longitude: ${this.longitude}`);
			frontmatterLines.push(`location: "${this.latitude}, ${this.longitude}"`);
		}
		
		// Add source if provided
		if (source.trim()) {
			frontmatterLines.push(`source: "${source.replace(/"/g, '\\"')}"`);
		}
		
		frontmatterLines.push("---");
	
		// Embed syntax (use ![[...]] for image, normal link for PDFs)
		const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(imagePath);
		let content = frontmatterLines.join("\n") + "\n\n";
		
		content += isImage
			? `![[${imagePath}]]`
			: `[Open file](${imagePath})`;
		
		if (description.trim()) {
			content += "\n\n" + description.trim();
		}
	
		// Save the file
		await app.vault.create(finalMdFilePath, content);
		return finalMdFilePath;
	}
}
