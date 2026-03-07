import { App, Modal, ButtonComponent, TFolder, TextComponent, DropdownComponent, Notice, normalizePath } from "obsidian";
import type MyPlugin from "./main";

export class FileImportModal extends Modal {
	plugin: MyPlugin;
	selectedFile: File | null;
	tags: string;
	selectedFolder: string;

	constructor(app: App, plugin: MyPlugin) {
		super(app);
		this.plugin = plugin;
		this.selectedFile = null;
		this.tags = "";
		this.selectedFolder = this.plugin.settings.defaultFolder;
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
		contentEl.createEl("br");

		// === Folder Dropdown ===
		contentEl.createEl("label", { text: "Save in folder:" });

		const folderDropdown = new DropdownComponent(contentEl);
		const folders = this.getAllFolders();

		for (const folderPath of folders) {
			folderDropdown.addOption(folderPath, folderPath);
		}

		folderDropdown.setValue(this.selectedFolder); // Default value
		folderDropdown.onChange(value => {
			this.selectedFolder = value;
		});

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

		// === Create File Button ===
		new ButtonComponent(contentEl)
			.setButtonText("Create File")
			.setCta()
			.onClick(async () => {
				if (!this.selectedFile) {
					new Notice("Please select a file first.");
					return;
				}

				const savedPath = await this.saveFileToVault(this.app, this.selectedFile, this.selectedFolder);
				const tagArray = this.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
				const mdPath = await this.createMarkdownWithMetadata(
					this.app,
					savedPath,
					this.selectedFolder,
					tagArray
				);
				
				// Placeholder for future logic:
				console.log({
					file: this.selectedFile,
					folder: this.selectedFolder,
					tags: this.tags,
					mdPath: mdPath
				});

				new Notice(`File saved to ${savedPath}`);
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
		await app.vault.createFolder(folderPath).catch(() => {
			// If folder exists already, ignore
		});
	
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


	async createMarkdownWithMetadata(
		app: App,
		imagePath: string,
		destFolder: string,
		tags: string[]
	): Promise<string> {
		const fileName = imagePath.split("/").pop()!.split(".")[0];
		const mdFileName = `${fileName}.md`;
		const mdFilePath = normalizePath(`${destFolder}/${mdFileName}`);

		// Prepare frontmatter
		const frontmatter = [
			"---",
			`tags: [${tags.map(t => t.trim()).filter(Boolean).join(", ")}]`,
			`resource: ${imagePath}`,
			"---",
		];
	
		// Embed syntax (use ![[...]] for image, normal link for PDFs)
		const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(imagePath);
		const body = isImage
			? `![[${imagePath}]]`
			: `[Open file](${imagePath})`;
	
		const content = frontmatter.join("\n") + "\n" + body;
	
		// Save the file
		await app.vault.create(mdFilePath, content);
		return mdFilePath;
	}


}

