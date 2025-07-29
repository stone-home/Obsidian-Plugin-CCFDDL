import { App, Plugin, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';
import * as yaml from 'js-yaml';

interface ConferenceSettings {
	yamlUrl: string;
	refreshInterval: number; // 刷新间隔（分钟）
}

const DEFAULT_SETTINGS: ConferenceSettings = {
	yamlUrl: 'https://ccfddl.com/conference/allconf.yml',
	refreshInterval: 60 // 默认60分钟刷新一次
}

interface ConferenceDeadline {
	title: string;
	year: number;
	deadline: string;
	abstractDeadline?: string;
	timezone: string;
	date: string;
	place: string;
	link: string;
	rank: {
		ccf?: string;
		core?: string;
		thcpl?: string;
	};
	sub: string;
	comment?: string;
}

export default class ConferenceDeadlinePlugin extends Plugin {
	settings: ConferenceSettings;
	cachedDeadlines: ConferenceDeadline[] = [];
	lastFetchTime: number = 0;

	async onload() {
		await this.loadSettings();

		// 添加ribbon图标
		this.addRibbonIcon('calendar-clock', 'Conference Deadlines', () => {
			this.showDeadlineModal();
		});

		// 添加命令
		this.addCommand({
			id: 'show-conference-deadlines',
			name: 'Show Conference Deadlines',
			callback: () => {
				this.showDeadlineModal();
			}
		});

		// 添加设置页面
		this.addSettingTab(new ConferenceSettingTab(this.app, this));

		// 初始加载数据
		this.loadConferenceData();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadConferenceData() {
		try {
			// 检查缓存是否过期
			const now = Date.now();
			if (this.cachedDeadlines.length > 0 &&
				now - this.lastFetchTime < this.settings.refreshInterval * 60 * 1000) {
				return;
			}

			new Notice('Fetching conference data...');

			const response = await fetch(this.settings.yamlUrl);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const yamlText = await response.text();
			const conferences = yaml.load(yamlText) as any[];

			this.cachedDeadlines = this.parseConferences(conferences);
			this.lastFetchTime = now;

			new Notice('Conference data updated successfully!');
		} catch (error) {
			console.error('Error fetching conference data:', error);
			new Notice('Failed to fetch conference data: ' + error.message);
		}
	}

	parseConferences(conferences: any[]): ConferenceDeadline[] {
		const deadlines: ConferenceDeadline[] = [];

		conferences.forEach(conf => {
			if (!conf.confs || !Array.isArray(conf.confs)) return;

			// 获取最新的会议信息（年份最大的）
			const latestConf = conf.confs.reduce((latest: any, current: any) => {
				return current.year > latest.year ? current : latest;
			});

			if (!latestConf.timeline || !Array.isArray(latestConf.timeline)) return;

			// 获取最新的截止时间
			latestConf.timeline.forEach((timeline: any) => {
				if (!timeline.deadline || timeline.deadline === 'TBD') return;

				const deadline: ConferenceDeadline = {
					title: conf.title,
					year: latestConf.year,
					deadline: timeline.deadline,
					abstractDeadline: timeline.abstract_deadline,
					timezone: latestConf.timezone || 'AoE',
					date: latestConf.date,
					place: latestConf.place,
					link: latestConf.link,
					rank: conf.rank || {},
					sub: conf.sub || 'Unknown',
					comment: timeline.comment
				};

				deadlines.push(deadline);
			});
		});

		// 按截止时间排序
		return deadlines.sort((a, b) => {
			const dateA = new Date(a.deadline);
			const dateB = new Date(b.deadline);
			return dateA.getTime() - dateB.getTime();
		});
	}

	async showDeadlineModal() {
		await this.loadConferenceData();
		new ConferenceDeadlineModal(this.app, this.cachedDeadlines).open();
	}
}

class ConferenceDeadlineModal extends Modal {
	deadlines: ConferenceDeadline[];

	constructor(app: App, deadlines: ConferenceDeadline[]) {
		super(app);
		this.deadlines = deadlines;
	}

	onOpen() {
		const { contentEl, modalEl } = this;

		// 添加自定义CSS类
		modalEl.addClass('conference-deadlines-modal');

		contentEl.empty();

		contentEl.createEl('h2', { text: 'Conference Deadlines' });

		// 添加筛选器
		const filterContainer = contentEl.createDiv('filter-container');
		filterContainer.style.marginBottom = '20px';

		const subjectFilter = filterContainer.createEl('select');
		subjectFilter.createEl('option', { text: 'All Subjects', value: '' });

		// 获取所有学科分类
		const subjects = [...new Set(this.deadlines.map(d => d.sub))].sort();
		const categoryTable = {
			DS: "Data Science",
			NW: "Networks",
			SC: "Security",
			SE: "Software Engineering",
			DB: "Database",
			CT: "Computer Theory",
			CG: "Computer Graphics",
			Ai: "Artificial Intelligence",
			HI: "Human-Computer Interaction",
			MX: "Mixture/Emerging"
		}
		subjects.forEach(sub => {
			const fullName = categoryTable[sub as keyof typeof categoryTable] || sub;
			subjectFilter.createEl('option', { text: fullName, value: sub });
		});

		const ccfFilter = filterContainer.createEl('select');
		ccfFilter.createEl('option', { text: 'All CCF Ranks', value: '' });
		['A', 'B', 'C', 'N'].forEach(rank => {
			ccfFilter.createEl('option', { text: `CCF ${rank}`, value: rank });
		});

		// 创建表格容器
		const tableContainer = contentEl.createDiv('table-container');
		const table = tableContainer.createEl('table');
		table.addClass('conference-table');
		table.style.width = '100%';
		table.style.borderCollapse = 'collapse';
		table.style.width = '100%';
		table.style.borderCollapse = 'collapse';

		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		['Conference', 'Year', 'Deadline', 'Time Left', 'Subject', 'CCF', 'Location'].forEach(header => {
			const th = headerRow.createEl('th');
			th.textContent = header;
			th.style.border = '1px solid #ddd';
			th.style.padding = '8px';
			th.style.backgroundColor = '#f5f5f5';
		});

		const tbody = table.createEl('tbody');

		const renderTable = () => {
			tbody.empty();

			const subjectValue = subjectFilter.value;
			const ccfValue = ccfFilter.value;

			const filteredDeadlines = this.deadlines.filter(deadline => {
				const subjectMatch = !subjectValue || deadline.sub === subjectValue;
				const ccfMatch = !ccfValue || deadline.rank.ccf === ccfValue;
				return subjectMatch && ccfMatch;
			});

			const now = new Date();

			filteredDeadlines.forEach(deadline => {
				const row = tbody.createEl('tr');

				// Conference name with link
				const nameCell = row.createEl('td');
				nameCell.style.border = '1px solid #ddd';
				nameCell.style.padding = '8px';
				if (deadline.link && deadline.link !== 'TBD') {
					const link = nameCell.createEl('a', { text: deadline.title });
					link.href = deadline.link;
					link.target = '_blank';
				} else {
					nameCell.textContent = deadline.title;
				}

				// Year
				const yearCell = row.createEl('td');
				yearCell.style.border = '1px solid #ddd';
				yearCell.style.padding = '8px';
				yearCell.textContent = deadline.year.toString();

				// Deadline
				const deadlineCell = row.createEl('td');
				deadlineCell.style.border = '1px solid #ddd';
				deadlineCell.style.padding = '8px';
				const deadlineText = new Date(deadline.deadline).toLocaleDateString() +
					(deadline.abstractDeadline ? ` (Abstract: ${new Date(deadline.abstractDeadline).toLocaleDateString()})` : '');
				deadlineCell.textContent = deadlineText;
				if (deadline.comment) {
					deadlineCell.title = deadline.comment;
				}

				// Time left
				const timeLeftCell = row.createEl('td');
				timeLeftCell.style.border = '1px solid #ddd';
				timeLeftCell.style.padding = '8px';
				const deadlineDate = new Date(deadline.deadline);
				const timeDiff = deadlineDate.getTime() - now.getTime();
				const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

				if (daysLeft < 0) {
					timeLeftCell.textContent = 'Passed';
					timeLeftCell.style.color = '#999';
				} else if (daysLeft === 0) {
					timeLeftCell.textContent = 'Today!';
					timeLeftCell.style.color = '#ff0000';
					timeLeftCell.style.fontWeight = 'bold';
				} else if (daysLeft <= 7) {
					timeLeftCell.textContent = `${daysLeft} days`;
					timeLeftCell.style.color = '#ff6600';
					timeLeftCell.style.fontWeight = 'bold';
				} else if (daysLeft <= 30) {
					timeLeftCell.textContent = `${daysLeft} days`;
					timeLeftCell.style.color = '#ff9900';
				} else {
					timeLeftCell.textContent = `${daysLeft} days`;
					timeLeftCell.style.color = '#009900';
				}

				// Subject
				const subjectCell = row.createEl('td');
				subjectCell.style.border = '1px solid #ddd';
				subjectCell.style.padding = '8px';
				subjectCell.textContent = deadline.sub;

				// CCF Rank
				const ccfCell = row.createEl('td');
				ccfCell.style.border = '1px solid #ddd';
				ccfCell.style.padding = '8px';
				const ccfRank = deadline.rank.ccf || 'N/A';
				ccfCell.textContent = ccfRank;

				// 根据CCF等级设置颜色
				if (ccfRank === 'A') {
					ccfCell.style.backgroundColor = '#ffeeee';
					ccfCell.style.color = '#cc0000';
				} else if (ccfRank === 'B') {
					ccfCell.style.backgroundColor = '#fff5ee';
					ccfCell.style.color = '#ff6600';
				} else if (ccfRank === 'C') {
					ccfCell.style.backgroundColor = '#f5f5ff';
					ccfCell.style.color = '#0066cc';
				}

				// Location
				const locationCell = row.createEl('td');
				locationCell.style.border = '1px solid #ddd';
				locationCell.style.padding = '8px';
				locationCell.textContent = deadline.place;
			});
		};

		// 添加筛选器事件监听
		subjectFilter.addEventListener('change', renderTable);
		ccfFilter.addEventListener('change', renderTable);

		// 初始渲染
		renderTable();

		// 添加刷新按钮
		const refreshButton = contentEl.createEl('button', { text: 'Refresh Data' });
		refreshButton.style.marginTop = '20px';
		refreshButton.addEventListener('click', async () => {
			const plugin = (this.app as any).plugins.plugins['conference-deadlines'];
			if (plugin) {
				plugin.lastFetchTime = 0; // 强制重新获取
				await plugin.loadConferenceData();
				this.deadlines = plugin.cachedDeadlines;
				renderTable();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ConferenceSettingTab extends PluginSettingTab {
	plugin: ConferenceDeadlinePlugin;

	constructor(app: App, plugin: ConferenceDeadlinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Conference Deadline Settings' });

		new Setting(containerEl)
			.setName('YAML URL')
			.setDesc('URL to fetch conference data from')
			.addText(text => text
				.setPlaceholder('https://ccfddl.com/conference/allconf.yml')
				.setValue(this.plugin.settings.yamlUrl)
				.onChange(async (value) => {
					this.plugin.settings.yamlUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Refresh Interval')
			.setDesc('How often to refresh conference data (in minutes)')
			.addText(text => text
				.setPlaceholder('60')
				.setValue(this.plugin.settings.refreshInterval.toString())
				.onChange(async (value) => {
					const interval = parseInt(value);
					if (!isNaN(interval) && interval > 0) {
						this.plugin.settings.refreshInterval = interval;
						await this.plugin.saveSettings();
					}
				}));
	}
}
