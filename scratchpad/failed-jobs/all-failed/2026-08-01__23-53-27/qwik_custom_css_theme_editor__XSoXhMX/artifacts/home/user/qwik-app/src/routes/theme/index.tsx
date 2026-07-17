import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form } from '@builder.io/qwik-city';

function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

function isValidFontSize(val: string): boolean {
  return /^\d+(\.\d+)?(px|rem|em)$/.test(val);
}

function isValidBorderRadius(val: string): boolean {
  return /^\d+(\.\d+)?(px|rem|em|%)$/.test(val);
}

export const useThemeLoader = routeLoader$(({ cookie }) => {
  const cookieVal = cookie.get('user_theme')?.value;
  let theme = {
    primaryColor: '#00bcd4',
    fontSize: '16px',
    borderRadius: '4px',
  };
  if (cookieVal) {
    try {
      const parsed = typeof cookieVal === 'string' ? JSON.parse(cookieVal) : cookieVal;
      if (parsed && typeof parsed === 'object') {
        theme = {
          primaryColor: parsed.primaryColor || theme.primaryColor,
          fontSize: parsed.fontSize || theme.fontSize,
          borderRadius: parsed.borderRadius || theme.borderRadius,
        };
      }
    } catch (e) {
      // ignore
    }
  }
  return theme;
});

export const useUpdateThemeAction = routeAction$(async (data, { cookie, fail, redirect }) => {
  const primaryColor = data.primaryColor as string;
  const fontSize = data.fontSize as string;
  const borderRadius = data.borderRadius as string;

  if (!isValidHex(primaryColor)) {
    return fail(400, { invalidField: 'primaryColor' });
  }
  if (!isValidFontSize(fontSize)) {
    return fail(400, { invalidField: 'fontSize' });
  }
  if (!isValidBorderRadius(borderRadius)) {
    return fail(400, { invalidField: 'borderRadius' });
  }

  cookie.set('user_theme', JSON.stringify({ primaryColor, fontSize, borderRadius }), { path: '/' });
  throw redirect(302, '/theme');
});

export default component$(() => {
  const theme = useThemeLoader();
  const action = useUpdateThemeAction();

  const primaryColor = useSignal(theme.value.primaryColor);
  const fontSize = useSignal(theme.value.fontSize);
  const borderRadius = useSignal(theme.value.borderRadius);

  useTask$(({ track }) => {
    track(() => theme.value);
    primaryColor.value = theme.value.primaryColor;
    fontSize.value = theme.value.fontSize;
    borderRadius.value = theme.value.borderRadius;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Custom CSS Theme Editor</h1>

      {action.value?.failed && (
        <div style={{ color: 'red', marginBottom: '15px' }} class="error-message">
          invalid {action.value.invalidField}
        </div>
      )}

      <Form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Primary Color:</label>
          <input
            type="text"
            name="primaryColor"
            bind:value={primaryColor}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Font Size:</label>
          <input
            type="text"
            name="fontSize"
            bind:value={fontSize}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Border Radius:</label>
          <input
            type="text"
            name="borderRadius"
            bind:value={borderRadius}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--border-radius)', cursor: 'pointer' }}>
          Save Theme
        </button>
      </Form>

      <form action="/theme/reset" method="post" style={{ marginTop: '15px' }}>
        <button type="submit" style={{ padding: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: 'var(--border-radius)', cursor: 'pointer' }}>
          Reset Theme
        </button>
      </form>
    </div>
  );
});
