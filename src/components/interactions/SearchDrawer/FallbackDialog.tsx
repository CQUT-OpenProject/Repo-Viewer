/**
 * 回退对话框组件
 *
 * 当索引搜索无结果时，提示用户是否切换到API模式重新搜索。
 */

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import React from "react";

/**
 * 回退对话框组件属性接口
 */
interface FallbackDialogProps {
  /** 对话框是否打开 */
  open: boolean;
  /** 关闭对话框回调 */
  onClose: () => void;
  /** 确认切换到API模式回调 */
  onConfirm: () => void;
}

export const FallbackDialog: React.FC<FallbackDialogProps> = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>使用 API 模式重新搜索？</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          当前索引模式未检索到任何结果，是否改用 API 模式重新搜索？
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onConfirm}>
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};
