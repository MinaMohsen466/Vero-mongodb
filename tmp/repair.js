const fs = require('fs');
const content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');
const lines = content.split('\n');

const toInsert = [
    "                                                            <td style={{ padding: '9px 12px' }}>",
    "                                                                <div style={{ fontWeight: 600 }}>{log.user_name}</div>",
    "                                                                {log.user_id && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>ID: {log.user_id}</div>}",
    "                                                            </td>",
    "                                                            <td style={{ padding: '9px 12px', textAlign: 'center' }}>",
    "                                                                <span style={{",
    "                                                                    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: '.75rem',",
    "                                                                    background: color + '18', color",
    "                                                                }}>{label}</span>",
    "                                                            </td>",
    "                                                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{modLabel}</td>",
    "                                                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.entity_ref}>",
    "                                                                {log.entity_ref || '—'}",
    "                                                            </td>",
    "                                                        </tr>",
    "                                                    );",
    "                                                })}",
    "                                            </tbody>",
    "                                        </table>",
    "                                        <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '.78rem', borderTop: '1px solid var(--border)' }}>",
    "                                            {activityLogs.length} {t('records') || 'سجل'}",
    "                                        </div>",
    "                                    </div>",
    "                                )}",
    "                            </Card>",
    "                        </>",
    "                    );",
    "                })()}"
];

const hasCarriageReturn = lines[0].endsWith('\r');
const preparedInsert = toInsert.map(line => hasCarriageReturn ? line + '\r' : line);

// Verify insertion point
if (lines[1272].includes('</td>')) {
    lines.splice(1273, 0, ...preparedInsert);
    fs.writeFileSync('src/pages/Settings.jsx', lines.join('\n'), 'utf8');
    console.log('Successfully repaired Settings.jsx');
} else {
    console.error('Error: Verification failed. line 1273 was not </td>. Found:', JSON.stringify(lines[1272]));
}
