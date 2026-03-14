import { SKILLS } from './skills';

/**
 * Gemini function declarations for the agent — shared across all RN platforms.
 */
export const AGENT_TOOLS = [
	{
		functionDeclarations: [
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
					'Present a file from the virtual filesystem to the user as a shareable artifact. Call this after creating any file the user should be able to download or share.',
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
							description: 'Array of 1-3 message variants',
							items: {
								type: 'OBJECT',
								properties: {
									label: { type: 'STRING', description: '2-4 word goal-oriented label' },
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
					'Display a structured recipe with ingredients, steps, and optional timers.',
				parameters: {
					type: 'OBJECT',
					properties: {
						title: { type: 'STRING', description: 'Recipe name' },
						description: { type: 'STRING', description: 'Brief description' },
						ingredients: {
							type: 'ARRAY',
							description: 'List of ingredients',
							items: {
								type: 'OBJECT',
								properties: {
									id: { type: 'STRING', description: 'Unique ID' },
									name: { type: 'STRING', description: 'Ingredient name' },
									amount: { type: 'NUMBER', description: 'Quantity' },
									unit: {
										type: 'STRING',
										description: 'Unit of measurement',
										enum: ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pinch', 'piece', '']
									}
								},
								required: ['id', 'name', 'amount']
							}
						},
						steps: {
							type: 'ARRAY',
							description: 'Ordered cooking steps',
							items: {
								type: 'OBJECT',
								properties: {
									id: { type: 'STRING', description: 'Unique step ID' },
									title: { type: 'STRING', description: 'Short step summary' },
									content: { type: 'STRING', description: 'Full instruction text' },
									timer_seconds: { type: 'NUMBER', description: 'Timer duration in seconds' }
								},
								required: ['id', 'title', 'content']
							}
						},
						base_servings: { type: 'NUMBER', description: 'Number of servings at base amounts' },
						notes: { type: 'STRING', description: 'Tips or notes' }
					},
					required: ['title', 'ingredients', 'steps']
				}
			},
			{
				name: 'show_widget',
				description:
					'Render an interactive visualization inline in chat. Use for: charts (Chart.js), diagrams (SVG/mermaid), mockups (HTML+CSS), interactive explainers (HTML+JS), and illustrative art (SVG). ALWAYS call read_skill with name "visualiser" before your first show_widget call in a conversation to load the design system, color palette, and rendering rules. Auto-detects mode: if code starts with <svg, SVG mode is used; otherwise HTML mode. A global sendPrompt(text) function is available in HTML mode to send messages back to chat.',
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
				description:
					'Fetch and process content from a URL. The prompt should contain the URL(s) and instructions.',
				parameters: {
					type: 'OBJECT',
					properties: {
						prompt: {
							type: 'STRING',
							description: 'A prompt containing the URL(s) to fetch and instructions'
						}
					},
					required: ['prompt']
				}
			},
			{
				name: 'web_search',
				description:
					'Search the web using Google Search for current information, news, facts, or any topic.',
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
					'Present clickable options to the user. Use when clarification is needed with 2-4 bounded choices.',
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
									options: {
										type: 'ARRAY',
										description: 'Array of 2-4 option labels',
										items: { type: 'STRING' }
									},
									type: {
										type: 'STRING',
										description: 'Selection type',
										enum: ['single_select', 'multi_select']
									}
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
