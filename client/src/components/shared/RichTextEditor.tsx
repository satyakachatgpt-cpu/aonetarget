import React from 'react';
import { CKEditor } from 'ckeditor4-react';

interface RichTextEditorProps {
    label?: string;
    content: string;
    onChange: (content: string) => void;
    height?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ label, content, onChange, height = '400px' }) => {
    return (
        <div className="w-full">
            {label && (
                <div className="mb-2">
                    <label className="text-[14px] font-semibold text-gray-800">{label}</label>
                    <div className="h-[1px] w-full bg-gray-100 mt-2 mb-4"></div>
                </div>
            )}
            <div className="border border-gray-200 rounded-sm overflow-hidden">
                <CKEditor
                    editorUrl="https://cdn.ckeditor.com/4.22.1/full-all/ckeditor.js"
                    onInstanceReady={(evt: any) => {
                        const editor = evt.editor;
                        const doc = editor.document.$;
                        const head = doc.getElementsByTagName('head')[0];
                        
                        // Aggressive Font Injection for Kruti Dev & Devlys
                        const style = doc.createElement('style');
                        style.type = 'text/css';
                        const css = `
                            @font-face { font-family: 'Kruti Dev 010'; src: url('https://cdn.jsdelivr.net/gh/Anilsharma012/Hindi-Fonts@master/Kruti_Dev_010.ttf') format('truetype'); }
                            @font-face { font-family: 'Kruti Dev 011'; src: url('https://cdn.jsdelivr.net/gh/Anilsharma012/Hindi-Fonts@master/Kruti_Dev_011.ttf') format('truetype'); }
                            @font-face { font-family: 'Kruti Dev 021'; src: url('https://cdn.jsdelivr.net/gh/Anilsharma012/Hindi-Fonts@master/Kruti_Dev_021.ttf') format('truetype'); }
                            @font-face { font-family: 'Devlys 010'; src: url('https://cdn.jsdelivr.net/gh/Anilsharma012/Hindi-Fonts@master/Devlys_010.ttf') format('truetype'); }
                        `;
                        
                        if (style.styleSheet) {
                            (style as any).styleSheet.cssText = css;
                        } else {
                            style.appendChild(doc.createTextNode(css));
                        }
                        head.appendChild(style);

                        // STEP 4 — HINDI TYPING FIX (IME Fix)
                        // Allow IME composition inside editor iframe
                        editor.editable().attachListener(
                            editor.editable(), 
                            'compositionstart', 
                            function() {
                                editor.setReadOnly(false);
                            }
                        );

                        // Fix: do not intercept keydown during IME composition
                        editor.editable().attachListener(
                            editor.editable(),
                            'keydown',
                            function(evt: any) {
                                // Let IME handle its own key events
                                if (evt.data.$.isComposing || evt.data.$.keyCode === 229) {
                                    evt.cancel();
                                }
                            },
                            null, null, 1  // priority 1 = before CKEditor's own handler
                        );

                        // ADD CUSTOM MATH HELPER BUTTONS
                        const addMathCommand = (name: string, label: string, latex: string) => {
                            editor.addCommand(name, {
                                exec: function(editor: any) {
                                    editor.insertHtml(`<span class="math-tex">\\(${latex}\\)</span>`);
                                }
                            });
                            editor.ui.addButton(label, {
                                label: label,
                                command: name,
                                toolbar: 'math_helpers'
                            });
                        };

                        addMathCommand('mathFraction', 'Fraction', '\\frac{a}{b}');
                        addMathCommand('mathSqrt', 'Square Root', '\\sqrt{x}');
                        addMathCommand('mathSum', 'Summation', '\\sum_{i=1}^{n}');
                        addMathCommand('mathInt', 'Integral', '\\int_{a}^{b} x dx');
                        addMathCommand('mathLimit', 'Limit', '\\lim_{x \\to \\infty}');
                        addMathCommand('mathVector', 'Vector', '\\vec{a}');
                    }}
                    initData={content}
                    onChange={(evt: any) => {
                        const data = evt.editor.getData();
                        onChange(data);
                    }}
                    config={{
                        height: height,
                        toolbar: [
                            { name: 'document', items: [ 'Source', '-', 'Save', 'NewPage', 'ExportPdf', 'Preview', 'Print', '-', 'Templates' ] },
                            { name: 'clipboard', items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
                            { name: 'editing', items: [ 'Find', 'Replace', '-', 'SelectAll', '-', 'Scayt' ] },
                            { name: 'forms', items: [ 'Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton', 'HiddenField' ] },
                            '/',
                            { name: 'basicstyles', items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'CopyFormatting', 'RemoveFormat' ] },
                            { name: 'math_helpers', items: [ 'Fraction', 'Square Root', 'Summation', 'Integral', 'Limit', 'Vector' ] },
                            { name: 'math', items: [ 'Mathjax', 'SpecialChar', 'CodeSnippet', 'Symbol' ] },
                            '/',
                            { name: 'paragraph', items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock' ] },
                            { name: 'links', items: [ 'Link', 'Unlink' ] },
                            { name: 'insert', items: [ 'Image', 'Table', 'HorizontalRule', 'Smiley', 'PageBreak', 'Emoji', 'Embed', 'Iframe' ] },
                            '/',
                            { name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
                            { name: 'colors', items: [ 'TextColor', 'BGColor' ] },
                            { name: 'tools', items: [ 'Maximize', 'ShowBlocks' ] },
                            { name: 'about', items: [ 'About' ] }
                        ],
                        extraPlugins: 'mathjax,justify,font,colorbutton,colordialog,emoji,forms,table,tableresize,uploadimage,uploadfile,codesnippet,embed,autoembed,balloonpanel,sourcearea,bidi,language,dialogadvtab,div,filebrowser,format,horizontalrule,iframe,image,indentblock,indentlist,link,list,liststyle,maximize,newpage,pagebreak,pastefromword,pastetext,preview,print,save,scayt,selectall,showblocks,showborders,smiley,specialchar,stylescombo,tabletools,templates,undo',
                        mathJaxLib: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/MathJax.js?config=TeX-AMS_HTML',
                        baseFloatZIndex: 100005,
                        font_names: 
                            // ── SYSTEM FONTS ──
                            'Arial/Arial, Helvetica, sans-serif;' +
                            'Arial Black/Arial Black, Gadget, sans-serif;' +
                            'Comic Sans MS/Comic Sans MS, cursive;' +
                            'Courier New/Courier New, Courier, monospace;' +
                            'Georgia/Georgia, serif;' +
                            'Impact/Impact, Charcoal, sans-serif;' +
                            'Lucida Console/Lucida Console, Monaco, monospace;' +
                            'Lucida Sans Unicode/Lucida Sans Unicode, Lucida Grande, sans-serif;' +
                            'Palatino Linotype/Palatino Linotype, Book Antiqua, Palatino, serif;' +
                            'Tahoma/Tahoma, Geneva, sans-serif;' +
                            'Times New Roman/Times New Roman, Times, serif;' +
                            'Trebuchet MS/Trebuchet MS, Helvetica, sans-serif;' +
                            'Verdana/Verdana, Geneva, sans-serif;' +
                            'Symbol/Symbol;' +
                            'Webdings/Webdings;' +
                            'Wingdings/Wingdings, Zapf Dingbats;' +

                            // ── GOOGLE FONTS — LATIN ──
                            'Poppins/Poppins, sans-serif;' +
                            'Roboto/Roboto, sans-serif;' +
                            'Open Sans/Open Sans, sans-serif;' +
                            'Lato/Lato, sans-serif;' +
                            'Montserrat/Montserrat, sans-serif;' +
                            'Raleway/Raleway, sans-serif;' +
                            'Oswald/Oswald, sans-serif;' +
                            'Nunito/Nunito, sans-serif;' +
                            'Nunito Sans/Nunito Sans, sans-serif;' +
                            'Ubuntu/Ubuntu, sans-serif;' +
                            'Merriweather/Merriweather, serif;' +
                            'Playfair Display/Playfair Display, serif;' +
                            'Source Sans Pro/Source Sans Pro, sans-serif;' +
                            'Source Serif Pro/Source Serif Pro, serif;' +
                            'PT Sans/PT Sans, sans-serif;' +
                            'PT Serif/PT Serif, serif;' +
                            'Noto Sans/Noto Sans, sans-serif;' +
                            'Noto Serif/Noto Serif, serif;' +
                            'Libre Baskerville/Libre Baskerville, serif;' +
                            'EB Garamond/EB Garamond, serif;' +
                            'Cormorant Garamond/Cormorant Garamond, serif;' +
                            'Cinzel/Cinzel, serif;' +
                            'Josefin Sans/Josefin Sans, sans-serif;' +
                            'Work Sans/Work Sans, sans-serif;' +
                            'Quicksand/Quicksand, sans-serif;' +
                            'Mulish/Mulish, sans-serif;' +
                            'Inter/Inter, sans-serif;' +
                            'DM Sans/DM Sans, sans-serif;' +
                            'Karla/Karla, sans-serif;' +
                            'Barlow/Barlow, sans-serif;' +
                            'Cabin/Cabin, sans-serif;' +
                            'Exo 2/Exo 2, sans-serif;' +
                            'Titillium Web/Titillium Web, sans-serif;' +
                            'Oxygen/Oxygen, sans-serif;' +
                            'Fira Sans/Fira Sans, sans-serif;' +
                            'Fira Mono/Fira Mono, monospace;' +
                            'Space Mono/Space Mono, monospace;' +
                            'JetBrains Mono/JetBrains Mono, monospace;' +
                            'IBM Plex Mono/IBM Plex Mono, monospace;' +
                            'IBM Plex Sans/IBM Plex Sans, sans-serif;' +

                            // ── GOOGLE FONTS — DISPLAY / DECORATIVE ──
                            'Dancing Script/Dancing Script, cursive;' +
                            'Pacifico/Pacifico, cursive;' +
                            'Lobster/Lobster, cursive;' +
                            'Lobster Two/Lobster Two, cursive;' +
                            'Caveat/Caveat, cursive;' +
                            'Indie Flower/Indie Flower, cursive;' +
                            'Shadows Into Light/Shadows Into Light, cursive;' +
                            'Satisfy/Satisfy, cursive;' +
                            'Great Vibes/Great Vibes, cursive;' +
                            'Parisienne/Parisienne, cursive;' +
                            'Sacramento/Sacramento, cursive;' +
                            'Courgette/Courgette, cursive;' +
                            'Permanent Marker/Permanent Marker, cursive;' +
                            'Architects Daughter/Architects Daughter, cursive;' +
                            'Kalam/Kalam, cursive;' +
                            'Amatic SC/Amatic SC, cursive;' +
                            'Righteous/Righteous, cursive;' +
                            'Fredoka One/Fredoka One, cursive;' +
                            'Russo One/Russo One, sans-serif;' +
                            'Orbitron/Orbitron, sans-serif;' +

                            // ── HINDI UNICODE FONTS (Google Fonts) ──
                            'Noto Sans Devanagari/Noto Sans Devanagari, sans-serif;' +
                            'Noto Serif Devanagari/Noto Serif Devanagari, serif;' +
                            'Hind/Hind, sans-serif;' +
                            'Mukta/Mukta, sans-serif;' +
                            'Baloo 2/Baloo 2, cursive;' +
                            'Rajdhani/Rajdhani, sans-serif;' +
                            'Tiro Devanagari/Tiro Devanagari, serif;' +
                            'Yatra One/Yatra One, cursive;' +
                            'Martel/Martel, serif;' +
                            'Shobhika/Shobhika, serif;' +
                            'Eczar/Eczar, serif;' +
                            'Vesper Libre/Vesper Libre, serif;' +
                            'Mangal/Mangal, sans-serif;' +
                            'Unica One/Unica One, cursive;' +
                            'Poppins Hindi/Poppins, sans-serif;' +

                            // ── KRUTI DEV (System — must be installed on PC) ──
                            'Kruti Dev 010/Kruti Dev 010;' +
                            'Kruti Dev 011/Kruti Dev 011;' +
                            'Kruti Dev 016/Kruti Dev 016;' +
                            'Kruti Dev 020/Kruti Dev 020;' +
                            'Kruti Dev 021/Kruti Dev 021;' +
                            'Kruti Dev 030/Kruti Dev 030;' +
                            'Kruti Dev 040/Kruti Dev 040;' +
                            'Kruti Dev 050/Kruti Dev 050;' +
                            'Kruti Dev 055/Kruti Dev 055;' +
                            'Kruti Dev 060/Kruti Dev 060;' +
                            'Kruti Dev 070/Kruti Dev 070;' +
                            'Kruti Dev 080/Kruti Dev 080;' +
                            'Kruti Dev 090/Kruti Dev 090;' +
                            'Kruti Dev 100/Kruti Dev 100;' +
                            'Kruti Dev 110/Kruti Dev 110;' +
                            'Kruti Dev 120/Kruti Dev 120;' +

                            // ── DEVLYS (System — must be installed on PC) ──
                            'Devlys 010/Devlys 010;' +
                            'Devlys 020/Devlys 020;' +
                            'Devlys 030/Devlys 030;' +
                            'Devlys 040/Devlys 040;' +
                            'Devlys 050/Devlys 050;' +
                            'Devlys 060/Devlys 060;' +
                            'Devlys 070/Devlys 070;' +
                            'Devlys 080/Devlys 080;' +
                            'Devlys 090/Devlys 090;' +
                            'Devlys 100/Devlys 100;' +

                            // ── SHUSHA / OTHER HINDI LEGACY ──
                            'Shusha/Shusha;' +
                            'Shivaji/Shivaji;' +
                            'Akruti/Akruti;' +
                            'Walkman Chanakya/Walkman Chanakya;',
                        contentsCss: [
                            'https://cdn.ckeditor.com/4.22.1/full-all/contents.css',
                            'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Raleway:wght@400;700&family=Oswald:wght@400;700&family=Nunito:wght@400;700&family=Nunito+Sans:wght@400;700&family=Ubuntu:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Source+Sans+Pro:wght@400;700&family=PT+Sans:wght@400;700&family=Noto+Sans:wght@400;700&family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;700&family=DM+Sans:wght@400;700&family=Work+Sans:wght@400;700&family=Quicksand:wght@400;700&family=Mulish:wght@400;700&family=Barlow:wght@400;700&family=Cabin:wght@400;700&family=Fira+Sans:wght@400;700&family=IBM+Plex+Sans:wght@400;700&family=Josefin+Sans:wght@400;700&display=swap',
                            'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Pacifico&family=Lobster&family=Caveat:wght@400;700&family=Indie+Flower&family=Shadows+Into+Light&family=Satisfy&family=Great+Vibes&family=Permanent+Marker&family=Kalam:wght@400;700&family=Amatic+SC:wght@400;700&family=Fredoka+One&family=Orbitron:wght@400;700&family=Russo+One&display=swap',
                            'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Serif+Devanagari:wght@400;700&family=Hind:wght@400;700&family=Mukta:wght@400;700&family=Baloo+2:wght@400;700&family=Rajdhani:wght@400;700&family=Tiro+Devanagari:wght@400;700&family=Yatra+One&family=Martel:wght@400;700&family=Eczar:wght@400;700&display=swap'
                        ],
                        fontSize_sizes: '8/8pt;9/9pt;10/10pt;11/11pt;12/12pt;14/14pt;16/16pt;18/18pt;20/20pt;22/22pt;24/24pt;26/26pt;28/28pt;36/36pt;48/48pt;72/72pt',
                        removeButtons: 'About',
                        colorButton_colors: '000000,4361EE,FF4B2B,2ECC71,F1C40F,9B59B6,34495E,7F8C8D,ffffff',
                        colorButton_enableAutomatic: true,
                        versionCheck: false,
                        removePlugins: 'elementspath',
                        resize_enabled: true,
                        allowedContent: true,
                        extraAllowedContent: 'span(*){*}; p(*){*}; div(*){*}; b; i; u; strike; br;',
                        autoParagraph: false,
                        startupFocus: true,
                    }}
                />
            </div>
            <style>{`
                .cke_chrome {
                    border: 1px solid #dcdcdc !important;
                    border-radius: 8px !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                    width: 100% !important;
                }
                @font-face {
                    font-family: 'KrutiDev010';
                    src: url('https://cdn.jsdelivr.net/gh/Anilsharma012/Hindi-Fonts@master/Kruti_Dev_010.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'KrutiDev011';
                    src: url('https://cdn.jsdelivr.net/gh/Anilsharma012/Hindi-Fonts@master/Kruti_Dev_011.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Devlys010';
                    src: url('https://cdn.jsdelivr.net/gh/Anilsharma012/Hindi-Fonts@master/Devlys_010.ttf') format('truetype');
                }
                
                /* Dropdown font display */
                .cke_panel_list a[title*="Kruti Dev 010"] { font-family: 'KrutiDev010' !important; font-size: 20px !important; }
                .cke_panel_list a[title*="Kruti Dev 011"] { font-family: 'KrutiDev011' !important; font-size: 20px !important; }
                .cke_panel_list a[title*="Devlys 010"] { font-family: 'Devlys010' !important; font-size: 20px !important; }
                
                .cke_float, .cke_dialog_container, .cke_panel, .cke_dialog { z-index: 100010 !important; }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
