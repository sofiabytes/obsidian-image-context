import {
	App,
	Modal,
	ButtonComponent,
	TFolder,
	TextComponent,
	DropdownComponent,
	Notice,
	normalizePath,
	TFile,
} from "obsidian";
import type PixNotePlugin from "./main";
import {ImageDetailsExifManager, CameraExifManager, CaptionExifManager, LocationExifManager, DateExifManager} from "./exif-manager"
import { load } from "exifreader";

export class FileImportModal extends Modal {
	plugin: PixNotePlugin;

	selectedFile: File | null = null;

	tags = "";
	source = "";
	description = "";

	imageDestFolder: string;
	noteDestFolder: string;

	// EXIF data
	exifData: Map<string, unknown> = new Map<string, unknown>();

	constructor(app: App, plugin: PixNotePlugin) {
		super(app);

		this.plugin = plugin;

		this.imageDestFolder = this.plugin.settings.imageFolder || "";
		this.noteDestFolder = this.plugin.settings.noteFolder || "";
	}

	// ------------------------------------------------------------
	// Modal lifecycle
	// ------------------------------------------------------------

	async onOpen() {
		this.createDialogue();
	}

	onClose() {
		this.contentEl.empty();
	}

	// ------------------------------------------------------------
	// Folder handling
	// ------------------------------------------------------------

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

	// ------------------------------------------------------------
	// UI
	// ------------------------------------------------------------

	createDialogue() {
		const { contentEl } = this;

		contentEl.empty();

		contentEl.createEl("h2", {
			text: "Add Image or PDF with Metadata",
		});

		// ============================================================
		// File picker
		// ============================================================

		const fileInput = createEl("input", {
			attr: {
				type: "file",
				accept: ".jpg,.jpeg,.png,.gif,.pdf",
				style: "display: none",
			},
		});

		const fileNameEl = contentEl.createEl("div", {
			text: "No file selected",
			cls: "selected-file-name",
		});

		fileInput.onchange = () => {
			if (fileInput.files && fileInput.files.length > 0) {
				this.selectedFile = fileInput.files[0];

				new Notice(`Selected file: ${this.selectedFile.name}`);

				fileNameEl.setText(this.selectedFile.name);
			}
		};

		new ButtonComponent(contentEl)
			.setButtonText("Select File")
			.onClick(() => fileInput.click());

		contentEl.appendChild(fileInput);
		contentEl.appendChild(fileNameEl);

		contentEl.createEl("br");

		// ============================================================
		// Folders
		// ============================================================

		const folders = this.getAllFolders();

		// Add configured folders even if they don't currently exist
		if (
			this.imageDestFolder !== "" &&
			!folders.includes(this.imageDestFolder)
		) {
			folders.push(this.imageDestFolder);
		}

		if (
			this.noteDestFolder !== "" &&
			!folders.includes(this.noteDestFolder)
		) {
			folders.push(this.noteDestFolder);
		}

		folders.sort();

		// ------------------------------------------------------------
		// Image folder
		// ------------------------------------------------------------

		contentEl.createEl("label", {
			text: "Save image in:",
		});

		const imageFolderDropdown = new DropdownComponent(contentEl);

		for (const folderPath of folders) {
			imageFolderDropdown.addOption(
				folderPath,
				folderPath === "" ? "/ (Root)" : folderPath
			);
		}

		imageFolderDropdown.setValue(
			folders.includes(this.imageDestFolder)
				? this.imageDestFolder
				: ""
		);

		imageFolderDropdown.onChange((value) => {
			this.imageDestFolder = value;
		});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// ------------------------------------------------------------
		// Note folder
		// ------------------------------------------------------------

		contentEl.createEl("label", {
			text: "Save metadata note in:",
		});

		const noteFolderDropdown = new DropdownComponent(contentEl);

		for (const folderPath of folders) {
			noteFolderDropdown.addOption(
				folderPath,
				folderPath === "" ? "/ (Root)" : folderPath
			);
		}

		noteFolderDropdown.setValue(
			folders.includes(this.noteDestFolder)
				? this.noteDestFolder
				: ""
		);

		noteFolderDropdown.onChange((value) => {
			this.noteDestFolder = value;
		});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// ============================================================
		// Tags
		// ============================================================

		contentEl.createEl("label", {
			text: "Tags (comma-separated):",
		});

		new TextComponent(contentEl)
			.setPlaceholder("e.g. reading, quote")
			.onChange((value) => {
				this.tags = value;
			});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// ============================================================
		// Source
		// ============================================================

		contentEl.createEl("label", {
			text: "Source (URL or Reference):",
		});

		new TextComponent(contentEl)
			.setPlaceholder("e.g. https://example.com")
			.onChange((value) => {
				this.source = value;
			});

		contentEl.createEl("br");
		contentEl.createEl("br");

		// ============================================================
		// Description
		// ============================================================

		contentEl.createEl("label", {
			text: "Description:",
		});

		const descriptionEl = contentEl.createEl("textarea", {
			attr: {
				rows: "4",
				style: "width: 100%;",
				placeholder: "Enter description here...",
			},
		});

		descriptionEl.oninput = (e) => {
			this.description = (e.target as HTMLTextAreaElement).value;
		};

		contentEl.createEl("br");
		contentEl.createEl("br");

		// ============================================================
		// EXIF checkbox
		// ============================================================

		const exifContainer = contentEl.createDiv();

		const exifCheckbox = exifContainer.createEl("input", {
			attr: {
				type: "checkbox",
			},
		});

		exifCheckbox.checked = this.extractExif;

		const exifLabel = exifContainer.createEl("label", {
			text: " Extract EXIF metadata",
		});

		exifLabel.prepend(exifCheckbox);

		exifCheckbox.onchange = () => {
			this.extractExif = exifCheckbox.checked;
		};

		contentEl.createEl("br");
		contentEl.createEl("br");

		// ============================================================
		// Create file
		// ============================================================

		new ButtonComponent(contentEl)
			.setButtonText("Create File")
			.setCta()
			.onClick(async () => {
				await this.importSelectedFile();
			});
	}

	// ------------------------------------------------------------
	// Main import flow
	// ------------------------------------------------------------

	async importSelectedFile() {
		if (!this.selectedFile) {
			new Notice("Please select a file first.");
			return;
		}

		try {
			new Notice("Importing file...");

			// Reset EXIF state from any previous import
			this.resetExifData();

			// Extract EXIF before saving
			if (this.extractExif) {
				await this.extractExifData(this.selectedFile);
			}

			// Save image/PDF
			const savedImagePath = await this.saveImage(
				this.selectedFile,
				this.imageDestFolder
			);

			// Parse tags
			const tagArray = this.tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean);

			// Create metadata note
			const mdPath = await this.saveMarkdown(
				savedImagePath,
				this.noteDestFolder,
				tagArray
			);

			// Open the newly-created note
			const mdFile = this.app.vault.getAbstractFileByPath(mdPath);

			if (mdFile instanceof TFile) {
				await this.app.workspace.getLeaf("tab").openFile(mdFile);
			}

			new Notice("File imported successfully.");

			this.close();
		} catch (error) {
			console.error("Error importing file:", error);

			new Notice(
				`Import failed: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}

	// ------------------------------------------------------------
	// EXIF
	// ------------------------------------------------------------

	resetExifData() {
		this.exifData = null;
		this.latitude = null;
		this.longitude = null;
		this.exifDate = null;
	}

	async extractExifData(file: File): Promise<void> {
		// PDFs don't contain normal image EXIF metadata
		if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
			return;
		}

		const frontmatter_dict: Map<string, string> = new Map()

		for (const extractor of [DateExifManager]) {
			try {
				const extract = await new extractor(file)
				const frontmatter = await extract.toFrontmatter()
				
				for (const [key, value] of frontmatter) {
					frontmatter_dict.set(key, value)
				}
			} catch (error) {
				console.error("Error extracting EXIF data:", error);
				new Notice("Problem extracting EXIF data: check the console for logs");
			}
		}
		this.exifData = frontmatter_dict
	}

	/**
	 * Get the human-readable EXIF description.
	 */
	private getExifDescription(tag: any): string | null {
		if (!tag) {
			return null;
		}

		if (typeof tag.description === "string") {
			return tag.description;
		}

		if (typeof tag.value === "string") {
			return tag.value;
		}

		return null;
	}

	// ------------------------------------------------------------
	// Save image / PDF
	// ------------------------------------------------------------

	async saveImage(
		file: File,
		destFolder: string
	): Promise<string> {
		const arrayBuffer = await file.arrayBuffer();

		const folderPath = normalizePath(destFolder || "");

		// Ensure destination folder exists
		if (
			folderPath !== "" &&
			!(await this.app.vault.adapter.exists(folderPath))
		) {
			await this.app.vault.createFolder(folderPath);
		}

		const originalName = file.name;

		const dotIndex = originalName.lastIndexOf(".");

		const fileBase =
			dotIndex > 0
				? originalName.substring(0, dotIndex)
				: originalName;

		const fileExt =
			dotIndex > 0
				? originalName.substring(dotIndex + 1)
				: "";

		// --------------------------------------------------------
		// Find unique filename
		// --------------------------------------------------------

		let fileName = originalName;

		let filePath = normalizePath(
			folderPath
				? `${folderPath}/${fileName}`
				: fileName
		);

		let counter = 1;

		while (await this.app.vault.adapter.exists(filePath)) {
			fileName = fileExt
				? `${fileBase}-${counter}.${fileExt}`
				: `${fileBase}-${counter}`;

			filePath = normalizePath(
				folderPath
					? `${folderPath}/${fileName}`
					: fileName
			);

			counter++;
		}

		await this.app.vault.createBinary(
			filePath,
			arrayBuffer
		);

		return filePath;
	}

	// ------------------------------------------------------------
	// Save Markdown
	// ------------------------------------------------------------

	async saveMarkdown(
		imagePath: string,
		destFolder: string,
		tags: string[]
	): Promise<string> {
		const fileName =
			imagePath.split("/").pop() || "Imported File";

		const extensionIndex = fileName.lastIndexOf(".");

		const fileNameWithoutExtension =
			extensionIndex > 0
				? fileName.substring(0, extensionIndex)
				: fileName;

		const folderPath = normalizePath(destFolder || "");

		// Ensure note destination exists
		if (
			folderPath !== "" &&
			!(await this.app.vault.adapter.exists(folderPath))
		) {
			await this.app.vault.createFolder(folderPath);
		}

		// --------------------------------------------------------
		// Find unique Markdown filename
		// --------------------------------------------------------

		let mdFileName = `${fileNameWithoutExtension}.md`;

		let mdFilePath = normalizePath(
			folderPath
				? `${folderPath}/${mdFileName}`
				: mdFileName
		);

		let counter = 1;

		while (await this.app.vault.adapter.exists(mdFilePath)) {
			mdFileName = `${fileNameWithoutExtension}-${counter}.md`;

			mdFilePath = normalizePath(
				folderPath
					? `${folderPath}/${mdFileName}`
					: mdFileName
			);

			counter++;
		}

		// --------------------------------------------------------
		// Frontmatter
		// --------------------------------------------------------

		let content = this.createFrontMatterLines(tags, imagePath);

		// Use a proper Obsidian wikilink
		content += `![[${imagePath}]]`;

		// Description
		if (this.description.trim()) {
			content += `\n\n${this.description.trim()}`;
		}

		await this.app.vault.create(
			mdFilePath,
			content
		);

		return mdFilePath;
	}

	// ------------------------------------------------------------
	// Frontmatter
	// ------------------------------------------------------------

	async createFrontMatterLines(tags: string[], imagePath: string): Promise<string> {
		const frontmatterLines: string[] = [
			"---",
		];

		// --------------------------------------------------------
		// Resource (wikilink to image)
		// --------------------------------------------------------

		frontmatterLines.push(`resource: "[[${imagePath}]]"`);

		// --------------------------------------------------------
		// Tags
		// --------------------------------------------------------

		if (tags.length > 0) {
			const cleanedTags = tags
				.map((tag) => tag.trim())
				.filter(Boolean)
				.map((tag) => {
					// Quote tags containing characters that could
					// interfere with YAML.
					if (/[\s,:#[\]{}"'`]/.test(tag)) {
						return `"${tag.replace(/"/g, '\\"')}"`;
					}

					return tag;
				});

			frontmatterLines.push(
				`tags: [${cleanedTags.join(", ")}]`
			);
		}

		// --------------------------------------------------------
		// Source
		// --------------------------------------------------------

		if (this.source.trim()) {
			const escapedSource = this.source
				.trim()
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"');

			frontmatterLines.push(
				`source: "${escapedSource}"`
			);
		}

		// --------------------------------------------------------
		// FRONTMATTER
		// --------------------------------------------------------

        Object.entries(this.exifData).forEach(([key, value]) => {
  			frontmatterLines.push(`${key}: ${value}`);
		});

		// --------------------------------------------------------
		// ENDLINES
		// --------------------------------------------------------
		frontmatterLines.push("---");

		// IMPORTANT: newline, not "/n"
		return frontmatterLines.join("\n") + "\n";
	}


}
