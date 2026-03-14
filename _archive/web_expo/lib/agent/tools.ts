import { SKILLS } from './skills/index';

export const AGENT_TOOLS = [
	{
		functionDeclarations: [
			{
				name: 'read_skill',
				description:
					'Load detailed instructions for a specific task (e.g. creating Word docs, PDFs, spreadsheets). ALWAYS call this before attempting an unfamiliar file creation task. Available skills: ' +
					SKILLS.map((s) => s.name).join(', '),
				parameters: {
					type: 'OBJECT',
					properties: {
						name: {
							type: 'STRING',
							description: 'The skill name to load',
							enum: SKILLS.map((s) => s.name)
						}
					},
					required: ['name']
				}
			},
			{
				name: 'execute_python',
				description:
					'Execute Python code in a sandboxed Pyodide environment. Use ONLY for: (1) installing packages via micropip, (2) running .py scripts written with write_file. Do NOT write long inline code — use write_file to create a .py file first, then execute it here. Stdout and stderr are captured and returned.',
				parameters: {
					type: 'OBJECT',
					properties: {
						description: {
							type: 'STRING',
							description: 'Brief human-readable intent of what this code does'
						},
						code: {
							type: 'STRING',
							description: 'The Python code to execute'
						}
					},
					required: ['code']
				}
			},
			{
				name: 'write_file',
				description:
					'Write any file to the virtual filesystem. Use for ALL file creation: text files, Python scripts (.py), HTML, CSV, etc. For binary file generation (DOCX, PDF, XLSX, PNG), write the Python script as a .py file here, then run it with execute_python. Use /output/ for user-facing files, /workspace/ for scripts and temporary files.',
				parameters: {
					type: 'OBJECT',
					properties: {
						description: {
							type: 'STRING',
							description: 'Brief human-readable intent'
						},
						path: {
							type: 'STRING',
							description: 'The file path (e.g. /output/result.txt)'
						},
						content: {
							type: 'STRING',
							description: 'The text content to write'
						}
					},
					required: ['path', 'content']
				}
			},
			{
				name: 'read_file',
				description: 'Read a text file from the virtual filesystem.',
				parameters: {
					type: 'OBJECT',
					properties: {
						description: {
							type: 'STRING',
							description: 'Brief human-readable intent'
						},
						path: {
							type: 'STRING',
							description: 'The file path to read'
						}
					},
					required: ['path']
				}
			},
			{
				name: 'list_directory',
				description: 'List files and directories in a path on the virtual filesystem.',
				parameters: {
					type: 'OBJECT',
					properties: {
						path: {
							type: 'STRING',
							description: 'The directory path to list (e.g. /output/)'
						}
					},
					required: ['path']
				}
			},
			{
				name: 'present_file',
				description:
					'Present a file from the virtual filesystem to the user as a downloadable artifact. Call this after creating any file the user should be able to download.',
				parameters: {
					type: 'OBJECT',
					properties: {
						path: {
							type: 'STRING',
							description: 'The file path to present (e.g. /output/document.docx)'
						},
						label: {
							type: 'STRING',
							description: 'A short human-readable label for the file (in Thaana if possible)'
						}
					},
					required: ['path', 'label']
				}
			},
			{
				name: 'message_compose',
				description:
					'Draft a message (email, Slack, or text) with goal-oriented approaches. Analyze the situation and generate 2-3 strategy variants that lead to different outcomes.',
				parameters: {
					type: 'OBJECT',
					properties: {
						kind: {
							type: 'STRING',
							description: 'Type of message',
							enum: ['email', 'textMessage', 'other']
						},
						summary_title: {
							type: 'STRING',
							description: 'Brief title summarizing the message purpose'
						},
						variants: {
							type: 'ARRAY',
							description: 'Array of 1-3 message variants with different approaches',
							items: {
								type: 'OBJECT',
								properties: {
									label: { type: 'STRING', description: 'Goal-oriented label' },
									body: { type: 'STRING', description: 'The message content' },
									subject: { type: 'STRING', description: 'Email subject line (only for email kind)' }
								},
								required: ['label', 'body']
							}
						}
					},
					required: ['kind', 'summary_title', 'variants']
				}
			},
			{
				name: 'recipe_display',
				description:
					'Display a structured recipe with ingredients, steps, and optional timers. Use when the user asks for a recipe, cooking instructions, or food preparation guide.',
				parameters: {
					type: 'OBJECT',
					properties: {
						title: { type: 'STRING', description: 'Recipe name' },
						description: { type: 'STRING', description: 'Brief description' },
						ingredients: {
							type: 'ARRAY',
							items: {
								type: 'OBJECT',
								properties: {
									id: { type: 'STRING' },
									name: { type: 'STRING' },
									amount: { type: 'NUMBER' },
									unit: { type: 'STRING', enum: ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pinch', 'piece', ''] }
								},
								required: ['id', 'name', 'amount']
							}
						},
						steps: {
							type: 'ARRAY',
							items: {
								type: 'OBJECT',
								properties: {
									id: { type: 'STRING' },
									title: { type: 'STRING' },
									content: { type: 'STRING' },
									timer_seconds: { type: 'NUMBER' }
								},
								required: ['id', 'title', 'content']
							}
						},
						base_servings: { type: 'NUMBER' },
						notes: { type: 'STRING' }
					},
					required: ['title', 'ingredients', 'steps']
				}
			},
			{
				name: 'show_widget',
				description:
					'Render an interactive visualization inline in chat. Use for: charts (Chart.js), diagrams (SVG/mermaid), mockups (HTML+CSS), interactive explainers (HTML+JS), and illustrative art (SVG). Auto-detects mode: if code starts with <svg, SVG mode is used; otherwise HTML mode. Use dark theme colors (bg: #242526, text: #e4e6eb, accent: #7d9fe3). For charts, load Chart.js from https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js. For mermaid diagrams, load from https://esm.sh/mermaid. A global sendPrompt(text) function is available to send messages back to chat.',
				parameters: {
					type: 'OBJECT',
					properties: {
						title: {
							type: 'STRING',
							description: 'Short snake_case identifier for the widget'
						},
						widget_code: {
							type: 'STRING',
							description: 'The HTML or SVG code to render. If it starts with <svg, SVG mode is used; otherwise HTML mode.'
						}
					},
					required: ['title', 'widget_code']
				}
			},
			{
				name: 'web_fetch',
				description: 'Fetch and process content from a URL.',
				parameters: {
					type: 'OBJECT',
					properties: {
						prompt: {
							type: 'STRING',
							description: 'A prompt containing the URL(s) to fetch and instructions for processing'
						}
					},
					required: ['prompt']
				}
			},
			{
				name: 'web_search',
				description: 'Search the web using Google Search for current information, news, facts, or any topic.',
				parameters: {
					type: 'OBJECT',
					properties: {
						query: {
							type: 'STRING',
							description: 'The search query (in English for best results)'
						}
					},
					required: ['query']
				}
			},
			{
				name: 'ask_user_input',
				description:
					'Present clickable options to the user. Use this instead of asking questions in prose when the question has 2-4 bounded choices.',
				parameters: {
					type: 'OBJECT',
					properties: {
						questions: {
							type: 'ARRAY',
							description: 'Array of 1-3 questions to present',
							items: {
								type: 'OBJECT',
								properties: {
									question: { type: 'STRING', description: 'The question text (in Thaana)' },
									options: { type: 'ARRAY', items: { type: 'STRING' } },
									type: { type: 'STRING', enum: ['single_select', 'multi_select'] }
								},
								required: ['question', 'options']
							}
						}
					},
					required: ['questions']
				}
			}
		]
	}
];
