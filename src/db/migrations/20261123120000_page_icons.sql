CREATE TABLE `page_icons` (
  `title` text PRIMARY KEY NOT NULL,
  `image_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `page_icons` (`title`, `image_id`) VALUES
  ('Copilot', '81fa38a548179c43f8adb8e77d686803'),
  ('ChatGPT 4o', 'd14f6b33536ea71303c8425d06123295'),
  ('Grok', 'd477bc3a85f82618f1352027b043429d'),
  ('DeepSRT', '5749f7d1cf3d11247ac3f1a4eddfb69c'),
  ('NotebookLM', '9f55e05a46d73bb4890352d2ff92e842'),
  ('Claude', '1a9b94668d997980d57f2288af039c19'),
  ('Gemini', '517629f79a96128e064032c65cfff887'),
  ('MCP', 'a664a528df5e2cbfa6c3b0cda850b72d');
--> statement-breakpoint
INSERT OR IGNORE INTO `gyazo_objects` (`image_id`, `extension`, `object_key`) VALUES
  ('81fa38a548179c43f8adb8e77d686803', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-25/81fa38a548179c43f8adb8e77d686803.png'),
  ('d14f6b33536ea71303c8425d06123295', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-40/d14f6b33536ea71303c8425d06123295.png'),
  ('d477bc3a85f82618f1352027b043429d', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-39/d477bc3a85f82618f1352027b043429d.png'),
  ('5749f7d1cf3d11247ac3f1a4eddfb69c', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-37/5749f7d1cf3d11247ac3f1a4eddfb69c.png'),
  ('9f55e05a46d73bb4890352d2ff92e842', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-39/9f55e05a46d73bb4890352d2ff92e842.png'),
  ('1a9b94668d997980d57f2288af039c19', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-43/1a9b94668d997980d57f2288af039c19.png'),
  ('517629f79a96128e064032c65cfff887', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-33/517629f79a96128e064032c65cfff887.png'),
  ('a664a528df5e2cbfa6c3b0cda850b72d', 'png', '916c3640-cadb-40b0-a2da-8e61ec874755-45/a664a528df5e2cbfa6c3b0cda850b72d.png');
