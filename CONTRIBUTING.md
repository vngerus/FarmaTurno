# Guía de Contribución para FarmaTurno Chile

¡Gracias por tu interés en contribuir a FarmaTurno Chile! Como proyecto académico (INACAP), valoramos mucho tu colaboración. Para mantener la calidad y consistencia del código, sigue las siguientes directrices.

## 1. Flujo de Trabajo (Workflow)

Para proponer cambios, utilizamos el flujo estándar de Pull Requests (PRs):

1. **Fork del Repositorio:** Haz un fork del repositorio oficial a tu propia cuenta de GitHub.
2. **Clonar Localmente:** Clona tu fork en tu entorno de desarrollo.
3. **Rama de Trabajo:** Crea una nueva rama partiendo de `main` con un nombre descriptivo y semántico:
   - Para nuevas funciones: `feature/nombre-de-la-mejora`
   - Para correcciones de errores: `fix/nombre-del-error`
   - Para mantenimiento o refactorizaciones: `refactor/nombre-del-cambio`
4. **Instalación de Dependencias:** Utiliza `pnpm` (el gestor de paquetes por defecto del proyecto) para instalar dependencias y levantar el servidor:
   ```bash
   pnpm install
   pnpm run dev
   ```
5. **Realizar Cambios:** Trabaja en tus cambios asegurándote de no dejar comentarios innecesarios o código muerto.
6. **Validación Local:** Antes de subir tus cambios, verifica que compilen correctamente sin advertencias ni errores:
   ```bash
   pnpm run build
   ```
7. **Hacer Push:** Sube tus cambios a tu repositorio remoto (`git push origin feature/nombre-de-la-mejora`).
8. **Crear Pull Request:** Abre un Pull Request desde tu fork hacia la rama `main` del repositorio oficial.

---

## 2. Reglas Generales de Código

- **Estilo:** Respeta el diseño neo-brutalista actual del sitio (colores HSL específicos, bordes oscuros marcados `#0f1f19`, sombras con desplazamiento de `4px` o `6px`).
- **Comentarios:** Evita dejar comentarios redundantes o de depuración en el código entregable.
- **Seguridad en Base de Datos:** Cualquier nueva consulta o tabla debe respetar las políticas de **Row Level Security (RLS)** de Supabase.

---

## 3. Plantilla de Pull Request

Al abrir un Pull Request, por favor completa el formulario preestablecido para describir tus cambios y facilitar el proceso de revisión.
