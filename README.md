# El viaje de una tapa de botella

Sitio web para reproducir el corto animado **«El viaje de una tapa de botella»**
de **JIANLIANG.Z** (50 s, 1920 × 1080, sin diálogo), con un relato de fondo sobre
el plástico que llega al mar.

Sin frameworks, sin dependencias y sin proceso de compilación: HTML, CSS y
JavaScript a secas, más el vídeo original.

---

## Ver el sitio

**Opción 1 — doble clic**

Abre `abrir.command`. Arranca el servidor local y abre el navegador.

> La primera vez, macOS puede pedir permiso para ejecutarlo
> (Ajustes → Privacidad y seguridad → «Abrir igualmente»).

**Opción 2 — terminal**

```bash
cd una-tapa-de-botella
python3 serve.py            # http://127.0.0.1:8123
```

y abre <http://127.0.0.1:8123> en el navegador.

No abras `index.html` haciendo doble clic: con el protocolo `file://` algunos
navegadores bloquean el vídeo. El servidor no es obligatorio por capricho:
`serve.py` admite peticiones **Range**, y sin ellas el navegador no puede saltar
a un punto del vídeo hasta haberlo descargado entero.

Para servirlo en la red local (móvil, tablet, otra máquina):

```bash
python3 serve.py 8123 0.0.0.0
```

---

## Qué incluye

| Archivo | Para qué |
| --- | --- |
| `index.html` | Contenido y estructura: portada, reproductor, el viaje, los datos, acciones y créditos |
| `styles.css` | Diseño: paleta tomada de los fotogramas, tipografía, rejilla y adaptación a móvil |
| `main.js` | Reproductor propio, capítulos, revelados al hacer scroll y cambio de idioma |
| `serve.py` | Servidor estático con soporte de `Range` (necesario para buscar dentro del vídeo) |
| `abrir.command` | Lanzador de doble clic para macOS |
| `assets/` | El vídeo original y los fotogramas extraídos de él |
| `favicon.svg` | Icono: una tapa vista desde arriba |
| `.preview/` | Dos capturas de referencia del resultado (portada y reproductor) |

### Detalles que quizá no se ven a simple vista

- **Reproductor propio**, no los controles del navegador: barra de progreso con
  marcas de capítulo, tiempo, silencio, pantalla completa y estado de audio.
- **Atajos de teclado** con el reproductor enfocado: `espacio` / `k` reproducir,
  `←` `→` ±5 s, `↑` `↓` volumen, `m` silencio, `f` pantalla completa.
- **Capítulos**: cualquiera de los seis salta a su minuto.
- **Si el navegador bloquea el audio** al pulsar reproducir, el vídeo arranca en
  silencio y aparece el aviso «Pulsa para escuchar».
- **ES / 中文**: todo el texto, los títulos, la marquesina y el título de la
  pestaña cambian de idioma; la elección se recuerda. También se puede enlazar
  directamente la versión china con `?lang=zh`.
- **La barra de navegación** se vuelve oscura al pasar sobre la sección del mar y
  sobre el pie, para no romper el contraste.
- **`prefers-reduced-motion`**: si el sistema pide menos movimiento, se apagan
  las animaciones y la marquesina.
- **Accesibilidad**: enlace de salto, textos alternativos en los fotogramas,
  etiquetas `aria` que cambian con el idioma, foco visible y `aria-live` al
  cambiar de idioma.
- **Nada sale del ordenador**: el vídeo se sirve desde `assets/`, sin analíticas
  ni peticiones externas.

---

## Cambiar el vídeo o los textos

- **El vídeo**: sustituye `assets/una-tapa-de-botella.mp4` (H.264 / AAC es lo más
  compatible) y el póster `assets/poster.jpg`. En `index.html`, el `<video>`
  apunta a esa ruta.
- **Los textos en español** están escritos directamente en `index.html`.
- **Las traducciones chinas** están en el objeto `zh` de `main.js`, con la misma
  clave que el atributo `data-i18n` del elemento.
- **Los capítulos** se editan en dos sitios que deben coincidir: la lista
  `.chapters` de `index.html` (`data-t` en segundos) y sus marcas en la barra.
- **Los datos y las fuentes** están en la sección `#datos`, con enlaces a los
  informes originales.

---

## Créditos

- Dirección y arte: **JIANLIANG.Z**
- Generación de vídeo: **MiniMax H3**
- Guion y texto: **GPT**
- Interfaz de generación: **ComfyUI**
- Programación: **DeepSeek**

---

## 中文说明

这是为动画短片《一只瓶盖的旅程》（作者 JIANLIANG.Z）做的播放网站。
纯静态页面：HTML、CSS 和一段原生 JavaScript，没有框架、没有依赖、无需构建。

**怎么看**：双击 `abrir.command`，或在终端里运行 `python3 serve.py`，
然后打开 <http://127.0.0.1:8123>。

请不要直接双击 `index.html`——`file://` 协议下部分浏览器会拦截视频播放。
`serve.py` 支持 Range 请求，所以拖动进度条可以立即跳到任意位置。

**功能**：自建播放器（进度条带章节标记、音量、全屏、键盘快捷键 Space / ← → / M / F）、
六个可点击章节、滚动渐显、以及右上角的 ES / 中文 切换（整站文案、页签标题、
滚动字幕都会跟着变，并记住你的选择；也可以用 `?lang=zh` 直接打开中文版）。

**换视频**：替换 `assets/una-tapa-de-botella.mp4`（建议 H.264 / AAC），
再换 `assets/poster.jpg` 封面即可。
