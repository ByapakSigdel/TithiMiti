// The Tools screen lives in src/screens so only this tab route registers it —
// keeping the implementation inside app/ also created a duplicate stale
// /converter stack route reachable by deep link.
import ToolsScreen from '@/src/screens/ToolsScreen';

export default ToolsScreen;
