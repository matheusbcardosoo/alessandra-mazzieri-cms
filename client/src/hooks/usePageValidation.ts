import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  PageBlock,
  ButtonBlockData,
  FormBlockData,
  TextBlockData,
  ImageBlockData,
  PageLayoutV2,
  PageSection
} from '../types';

type PageForm = {
  id?: string;
  title: string;
  slug: string;
  description?: string | null;
  layout: PageLayoutV2;
  status: 'draft' | 'published';
  publishedAt?: string | null;
};

export type ValidationError = {
  id: string;
  type: 'required' | 'broken-image' | 'char-limit';
  field: string;
  message: string;
  sectionId?: string;
  blockId?: string;
};

export type FieldValidationState = {
  hasError: boolean;
  isTouched: boolean;
  errorMessage?: string;
};

type ValidationState = {
  imageStates: Record<string, 'loading' | 'valid' | 'broken'>;
};

const IMAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const IMAGE_DEBOUNCE_MS = 450;

export function usePageValidation(page: PageForm) {
  const [state, setState] = useState<ValidationState>({
    imageStates: {}
  });

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Refs for image validation
  const debounceTimerRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<string, { ok: boolean; ts: number }>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const isPlaceholderImage = useCallback((data: ImageBlockData) => {
    const url = data?.src ?? '';
    if (!url || !data?.mediaId) return true;
    const lower = url.toLowerCase();
    return (
      lower.includes('via.placeholder.com') ||
      lower.includes('placeholder.com') ||
      lower.includes('clique+para+editar') ||
      lower.includes('clique%20para%20editar') ||
      lower.includes('text=clique') ||
      lower.includes('clique%20para') ||
      lower.includes('clique-para')
    );
  }, []);

  const markFieldTouched = useCallback((fieldId: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldId));
  }, []);

  const validatePageFields = useCallback(() => {
    const errors: ValidationError[] = [];
    const fieldStates: Record<string, FieldValidationState> = {};

    const titleError = !page.title.trim();
    fieldStates['page-title'] = {
      hasError: titleError,
      isTouched: touchedFields.has('page-title'),
      errorMessage: titleError ? 'Titulo obrigatorio' : undefined
    };
    if (titleError && touchedFields.has('page-title')) {
      errors.push({ id: 'page-title', type: 'required', field: 'Titulo', message: 'Titulo obrigatorio' });
    }

    const slugError = !page.slug.trim();
    fieldStates['page-slug'] = {
      hasError: slugError,
      isTouched: touchedFields.has('page-slug'),
      errorMessage: slugError ? 'URL obrigatoria' : undefined
    };
    if (slugError && touchedFields.has('page-slug')) {
      errors.push({ id: 'page-slug', type: 'required', field: 'URL', message: 'URL obrigatoria' });
    }

    return { errors, fieldStates };
  }, [page.title, page.slug, touchedFields]);

  const validateBlocks = useCallback(() => {
    const errors: ValidationError[] = [];
    const fieldStates: Record<string, FieldValidationState> = {};

    page.layout.sections.forEach((section: PageSection) => {
      section.cols.forEach((column) => {
        column.blocks.forEach((block: PageBlock) => {
          const blockPrefix = `block-${block.id}`;

          switch (block.type) {
            case 'button': {
              const data = block.data as ButtonBlockData;
              const labelError = !data.label?.trim();
              fieldStates[`${blockPrefix}-label`] = {
                hasError: labelError,
                isTouched: touchedFields.has(`${blockPrefix}-label`),
                errorMessage: labelError ? 'Texto do botao obrigatorio' : undefined
              };
              if (labelError && touchedFields.has(`${blockPrefix}-label`)) {
                errors.push({
                  id: `${blockPrefix}-label`,
                  type: 'required',
                  field: 'Texto do botao',
                  message: 'Texto do botao obrigatorio',
                  sectionId: section.id,
                  blockId: block.id
                });
              }

              const hrefError = !data.href?.trim();
              fieldStates[`${blockPrefix}-href`] = {
                hasError: hrefError,
                isTouched: touchedFields.has(`${blockPrefix}-href`),
                errorMessage: hrefError ? 'Link obrigatorio' : undefined
              };
              if (hrefError && touchedFields.has(`${blockPrefix}-href`)) {
                errors.push({
                  id: `${blockPrefix}-href`,
                  type: 'required',
                  field: 'Link do botao',
                  message: 'Link obrigatorio',
                  sectionId: section.id,
                  blockId: block.id
                });
              }
              break;
            }

            case 'form': {
              const data = block.data as FormBlockData;
              const fieldsError = !data.fields || data.fields.length === 0;
              fieldStates[`${blockPrefix}-fields`] = {
                hasError: fieldsError,
                isTouched: touchedFields.has(`${blockPrefix}-fields`),
                errorMessage: fieldsError ? 'Adicione pelo menos um campo' : undefined
              };
              if (fieldsError && touchedFields.has(`${blockPrefix}-fields`)) {
                errors.push({
                  id: `${blockPrefix}-fields`,
                  type: 'required',
                  field: 'Campos do formulario',
                  message: 'Adicione pelo menos um campo',
                  sectionId: section.id,
                  blockId: block.id
                });
              }

              const submitError = !data.submitLabel?.trim();
              fieldStates[`${blockPrefix}-submit`] = {
                hasError: submitError,
                isTouched: touchedFields.has(`${blockPrefix}-submit`),
                errorMessage: submitError ? 'Texto do botao obrigatorio' : undefined
              };
              if (submitError && touchedFields.has(`${blockPrefix}-submit`)) {
                errors.push({
                  id: `${blockPrefix}-submit`,
                  type: 'required',
                  field: 'Botao do formulario',
                  message: 'Texto do botao obrigatorio',
                  sectionId: section.id,
                  blockId: block.id
                });
              }
              break;
            }

            case 'text': {
              const data = block.data as TextBlockData;
              const isEmpty =
                !data.contentHtml ||
                data.contentHtml.trim() === '<p>Digite seu conteudo</p>' ||
                data.contentHtml.trim() === '<p>Digite seu conteudo</p>' ||
                data.contentHtml.trim() === '<p></p>' ||
                data.contentHtml.replace(/<[^>]*>/g, '').trim() === '';

              fieldStates[`${blockPrefix}-content`] = {
                hasError: isEmpty,
                isTouched: touchedFields.has(`${blockPrefix}-content`),
                errorMessage: isEmpty ? 'Conteudo vazio (aviso)' : undefined
              };
              break;
            }

            default:
              break;
          }
        });
      });
    });

    return { errors, fieldStates };
  }, [page.layout, touchedFields]);

  const pageValidation = useMemo(() => validatePageFields(), [validatePageFields]);
  const blockValidation = useMemo(() => validateBlocks(), [validateBlocks]);
  const errors = useMemo(
    () => [...pageValidation.errors, ...blockValidation.errors],
    [pageValidation, blockValidation]
  );
  const fieldStates = useMemo(
    () => ({ ...pageValidation.fieldStates, ...blockValidation.fieldStates }),
    [pageValidation, blockValidation]
  );

  const collectImageBlocks = useCallback(() => {
    const list: Array<{ id: string; url: string; data: ImageBlockData }> = [];
    page.layout.sections.forEach((section: PageSection) => {
      section.cols.forEach((column) => {
        column.blocks.forEach((block: PageBlock) => {
          if (block.type !== 'image') return;
          const data = block.data as ImageBlockData;
          if (!data?.src || isPlaceholderImage(data)) return;
          list.push({ id: block.id, url: data.src, data });
        });
      });
    });
    return list;
  }, [isPlaceholderImage, page.layout]);

  const validateImages = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const now = Date.now();
      const cache = cacheRef.current;
      const pending = pendingRef.current;
      const images = collectImageBlocks();

      // Map url -> ids
      const urlToIds = images.reduce<Record<string, string[]>>((acc, img) => {
        if (!acc[img.url]) acc[img.url] = [];
        acc[img.url].push(img.id);
        return acc;
      }, {});

      const nextStates: Record<string, 'loading' | 'valid' | 'broken'> = {};
      const toValidate: string[] = [];

      images.forEach((img) => {
        const cached = cache.get(img.url);
        if (cached && now - cached.ts < IMAGE_CACHE_TTL) {
          nextStates[img.id] = cached.ok ? 'valid' : 'broken';
          return;
        }

        nextStates[img.id] = 'loading';
        if (!pending.has(img.url)) {
          pending.add(img.url);
          toValidate.push(img.url);
        }
      });

      // Remove states for images that no longer exist
      const existingIds = new Set(images.map((i) => i.id));
      Object.entries(state.imageStates).forEach(([id, status]) => {
        if (!existingIds.has(id)) return;
        if (!nextStates[id]) {
          nextStates[id] = status;
        }
      });

      setState((prev) => {
        const same =
          Object.keys(prev.imageStates).length === Object.keys(nextStates).length &&
          Object.entries(nextStates).every(([k, v]) => prev.imageStates[k] === v);
        return same ? prev : { ...prev, imageStates: nextStates };
      });

      if (toValidate.length) {
        toValidate.forEach((url) => {
          const img = new Image();
          img.onload = () => {
            cache.set(url, { ok: true, ts: Date.now() });
            pending.delete(url);
            setState((prev) => {
              const updated = { ...prev.imageStates };
              (urlToIds[url] || []).forEach((id) => {
                updated[id] = 'valid';
              });
              return { ...prev, imageStates: updated };
            });
          };
          img.onerror = () => {
            cache.set(url, { ok: false, ts: Date.now() });
            pending.delete(url);
            setState((prev) => {
              const updated = { ...prev.imageStates };
              (urlToIds[url] || []).forEach((id) => {
                updated[id] = 'broken';
              });
              return { ...prev, imageStates: updated };
            });
          };
          img.src = url;
        });
      }
    }, IMAGE_DEBOUNCE_MS);
  }, [collectImageBlocks, state.imageStates]);

  useEffect(() => {
    validateImages();
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [validateImages]);

  const getCharCount = useCallback((text: string, limit?: number) => {
    const count = text?.length || 0;
    return {
      count,
      limit,
      isOverLimit: limit ? count > limit : false,
      display: limit ? `${count}/${limit}` : `${count}`
    };
  }, []);

  const validateForPublication = useCallback(() => {
    const allFieldIds = new Set<string>();
    allFieldIds.add('page-title');
    allFieldIds.add('page-slug');

    page.layout.sections.forEach((section: PageSection) => {
      section.cols.forEach((column) => {
        column.blocks.forEach((block: PageBlock) => {
          const blockPrefix = `block-${block.id}`;
          switch (block.type) {
            case 'button':
              allFieldIds.add(`${blockPrefix}-label`);
              allFieldIds.add(`${blockPrefix}-href`);
              break;
            case 'form':
              allFieldIds.add(`${blockPrefix}-fields`);
              allFieldIds.add(`${blockPrefix}-submit`);
              break;
            case 'text':
              allFieldIds.add(`${blockPrefix}-content`);
              break;
            default:
              break;
          }
        });
      });
    });

    setTouchedFields(allFieldIds);

    const pageValidation = validatePageFields();
    const blockValidation = validateBlocks();
    const allErrors = [...pageValidation.errors, ...blockValidation.errors];

    const imageErrors: ValidationError[] = [];
    Object.entries(state.imageStates).forEach(([blockId, status]) => {
      if (status === 'broken') {
        imageErrors.push({
          id: `image-${blockId}`,
          type: 'broken-image',
          field: 'Imagem',
          message: 'Imagem nao pode ser carregada',
          blockId
        });
      }
    });

    return [...allErrors, ...imageErrors];
  }, [page.layout, state.imageStates, validateBlocks, validatePageFields]);

  return {
    errors,
    fieldStates,
    imageStates: state.imageStates,
    markFieldTouched,
    getCharCount,
    validateForPublication
  };
}
